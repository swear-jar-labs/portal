"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Field,
  FileButton,
  Form,
  HorizontalSlider,
  Stack,
  Text,
  Textarea,
} from "@swearjar/dos";
import { messages } from "@/content/messages";
import {
  AVATAR_CANVAS_UNAVAILABLE,
  AVATAR_DECODE_FAILED,
  AVATAR_INPUT_TYPES,
  AVATAR_MAX_INPUT_BYTES,
  AVATAR_ZOOM_MAX,
  AVATAR_ZOOM_MIN,
  AVATAR_ZOOM_STEP,
  adjustAvatarZoom,
  blobToDataUrl,
  drawAvatar,
  encodeAvatar,
  panCrop,
  type Crop,
} from "./avatar-image";
import { mockSaveProfile } from "./mock-profile-actions";
import { profileSchema } from "./schema";
import type { MemberProfile } from "./data";
import styles from "./ProfileEditForm.module.css";

const copy = messages.account.profile.edit;
const DEFAULT_CROP: Crop = { x: 50, y: 50, zoom: AVATAR_ZOOM_MIN };
const KEY_PAN_PIXELS = 12;

// The canvas pipeline reports its own failure code, so each case keeps its
// message: a missing 2d context is not a compression miss, and an unreadable
// blob is not an oversized one.
function avatarFailureMessage(error: unknown): string {
  if (error instanceof Error && error.message === AVATAR_CANVAS_UNAVAILABLE)
    return copy.unavailable;
  if (error instanceof Error && error.message === AVATAR_DECODE_FAILED) return copy.decodeImage;
  return copy.compressImage;
}

export function ProfileEditForm({
  profile,
  onCancel,
  onSaved,
  onBusyChange,
}: {
  profile: MemberProfile;
  onCancel: () => void;
  onSaved: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const router = useRouter();
  const cropHintId = useId();
  const zoomId = `${cropHintId}-zoom`;
  const removeAvatarId = `${cropHintId}-remove-avatar`;
  const saveId = `${cropHintId}-save`;
  const [username, setUsername] = useState(profile.user);
  const [bio, setBio] = useState(profile.bio);
  const [avatarChange, setAvatarChange] = useState<null | undefined>(undefined);
  const [source, setSource] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>(DEFAULT_CROP);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const savingRef = useRef(false);
  // The remove control only exists when there is something to remove: a
  // freshly picked image, or a stored avatar not yet marked for removal.
  const canRemoveAvatar =
    source !== null || (avatarChange !== null && profile.avatar !== undefined);

  useEffect(() => {
    if (source === null) return;
    const loaded = new Image();
    loaded.onload = () => setImage(loaded);
    loaded.onerror = () => {
      setImage(null);
      setError(copy.decodeImage);
    };
    loaded.src = source;
    return () => {
      loaded.onload = null;
      loaded.onerror = null;
      URL.revokeObjectURL(source);
    };
  }, [source]);

  useEffect(() => {
    if (image && canvasRef.current) {
      try {
        drawAvatar(canvasRef.current, image, crop);
      } catch {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the effect syncs the canvas bitmap with crop state; this branch only surfaces a terminal missing-2d-context, never a render cascade.
        setError(copy.unavailable);
      }
    }
  }, [image, crop]);

  function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !AVATAR_INPUT_TYPES.some((type) => type === file.type) ||
      file.size > AVATAR_MAX_INPUT_BYTES
    ) {
      setError(copy.invalidImage);
      return;
    }
    setImage(null);
    setSource(URL.createObjectURL(file));
    setAvatarChange(undefined);
    setCrop(DEFAULT_CROP);
    setError(null);
  }

  async function save() {
    if (savingRef.current) return;
    const parsed = profileSchema.safeParse({ username, bio });
    if (!parsed.success) {
      setError(
        parsed.error.issues.some((issue) => issue.path[0] === "username")
          ? copy.invalidUser
          : copy.invalidBio,
      );
      return;
    }
    savingRef.current = true;
    onBusyChange(true);
    setError(null);
    startTransition(async () => {
      try {
        let avatar: string | null | undefined = avatarChange;
        if (source) {
          if (!image || !canvasRef.current) {
            setError(copy.decodeImage);
            return;
          }
          try {
            drawAvatar(canvasRef.current, image, crop);
            avatar = await blobToDataUrl(await encodeAvatar(canvasRef.current));
          } catch (error) {
            setError(avatarFailureMessage(error));
            return;
          }
        }
        const result = await mockSaveProfile({
          username: parsed.data.username,
          bio: parsed.data.bio,
          avatar,
        });
        if (!result.ok) {
          setError(copy[result.error === "taken" ? "taken" : "unavailable"]);
          return;
        }
        onSaved();
        router.refresh();
      } catch {
        setError(copy.unavailable);
      } finally {
        savingRef.current = false;
        onBusyChange(false);
      }
    });
  }

  function moveImage(deltaX: number, deltaY: number, canvas: HTMLCanvasElement) {
    if (!image) return;
    const bounds = canvas.getBoundingClientRect();
    setCrop((current) =>
      panCrop(
        image.naturalWidth,
        image.naturalHeight,
        current,
        deltaX,
        deltaY,
        bounds.width,
        bounds.height,
      ),
    );
  }

  function beginDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (!image || event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragImage(event: PointerEvent<HTMLCanvasElement>) {
    const previous = dragRef.current;
    if (!previous || previous.pointerId !== event.pointerId) return;
    moveImage(event.clientX - previous.x, event.clientY - previous.y, event.currentTarget);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function endDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function nudgeImage(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById(zoomId)?.focus();
      return;
    }
    const zoomDirection =
      event.key === "+" || event.code === "NumpadAdd"
        ? 1
        : event.key === "-" || event.code === "NumpadSubtract"
          ? -1
          : null;
    if (zoomDirection !== null) {
      event.preventDefault();
      setCrop((current) => ({
        ...current,
        zoom: adjustAvatarZoom(current.zoom, zoomDirection),
      }));
      return;
    }
    const delta = {
      ArrowLeft: [-KEY_PAN_PIXELS, 0],
      ArrowRight: [KEY_PAN_PIXELS, 0],
      ArrowUp: [0, KEY_PAN_PIXELS],
      ArrowDown: [0, -KEY_PAN_PIXELS],
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    moveImage(delta[0] ?? 0, delta[1] ?? 0, event.currentTarget);
  }

  return (
    <Form onSubmit={save} ariaLabel={copy.heading}>
      <Stack gap={8}>
        <Field
          label={copy.username}
          name="username"
          value={username}
          onChange={setUsername}
          autoFocus
        />
        <Textarea label={copy.bio} name="bio" value={bio} onChange={setBio} rows={3} />
        <div>
          <FileButton accept={AVATAR_INPUT_TYPES.join(",")} onChange={pickImage}>
            {copy.chooseImage}
          </FileButton>
        </div>
        {source ? (
          <Stack gap={4}>
            <div id={cropHintId}>
              <Text role="hint">{copy.hint}</Text>
            </div>
            <canvas
              ref={canvasRef}
              className={styles.preview}
              role="img"
              aria-label={copy.crop}
              aria-describedby={cropHintId}
              tabIndex={0}
              onPointerDown={beginDrag}
              onPointerMove={dragImage}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={nudgeImage}
            />
            <HorizontalSlider
              id={zoomId}
              label={copy.zoom}
              value={crop.zoom}
              min={AVATAR_ZOOM_MIN}
              max={AVATAR_ZOOM_MAX}
              step={AVATAR_ZOOM_STEP}
              onChange={(zoom) => setCrop({ ...crop, zoom })}
              onKeyDown={(event) => {
                if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                event.preventDefault();
                if (event.repeat) return;
                if (event.key === "ArrowUp") canvasRef.current?.focus();
                else
                  (
                    document.getElementById(removeAvatarId) ?? document.getElementById(saveId)
                  )?.focus();
              }}
            />
          </Stack>
        ) : avatarChange === null ? (
          <Avatar user={username} size="lg" />
        ) : (
          <Avatar user={username} src={profile.avatar} size="lg" />
        )}
        {canRemoveAvatar ? (
          <div>
            <Button
              id={removeAvatarId}
              onClick={() => {
                setSource(null);
                setImage(null);
                setAvatarChange(null);
              }}
              onKeyDown={(event) => {
                if (event.key !== "ArrowDown" && (event.key !== "ArrowUp" || !source)) return;
                event.preventDefault();
                if (event.repeat) return;
                document.getElementById(event.key === "ArrowDown" ? saveId : zoomId)?.focus();
              }}
            >
              {copy.removeAvatar}
            </Button>
          </div>
        ) : null}
        {error ? <Text role="danger">{error}</Text> : null}
        <Stack direction="row" gap={8}>
          <Button
            id={saveId}
            type="submit"
            variant="primary"
            disabled={pending}
            onKeyDown={(event) => {
              if (event.key !== "ArrowUp") return;
              event.preventDefault();
              if (!event.repeat)
                (
                  document.getElementById(removeAvatarId) ?? document.getElementById(zoomId)
                )?.focus();
            }}
          >
            {copy.save}
          </Button>
          <Button onClick={onCancel} disabled={pending}>
            {copy.cancel}
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
}
