export function getAdminSessionRedirect(pathname, hasSession) {
  if (!hasSession) {
    return null;
  }

  if (pathname === "/" || pathname.endsWith("/login")) {
    return "/admin";
  }

  return null;
}

export function getAdminLogoutRedirect() {
  return "/";
}
