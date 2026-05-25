/**
 * Like `authenticate`, but lets the request through even if no/invalid token.
 * Sets `req.user` when a valid token is present; otherwise leaves it undefined.
 * Useful for endpoints whose behavior changes when the caller is logged in
 * (e.g. "show me only my jobs" filter on the public listing).
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }
  try {
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      next();
      return;
    }
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (user && user.isActive) {
      req.user = { id: user.id, email: user.email, role: user.role };
    }
    next();
  } catch {
    // Invalid token on an optional-auth route: ignore and proceed anonymously.
    next();
  }
}