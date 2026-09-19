static Node *term(Cursor *in) {
  Node *node = atom(in);
  while (in->tok == TOK_STAR || in->tok == TOK_SLASH) {
    node = binary(next(in), node, atom(in));
  }
  return node;
}
