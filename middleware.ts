import { withAuth } from "next-auth/middleware";

export default withAuth(

  {
    pages: {
      signIn: "/auth/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/all-interviews/:path*",
    "/scheduled-interviews/:path*",
  ],
};
