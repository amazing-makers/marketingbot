import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LandingClient from "./LandingClient";
import MobileLandingClient from "@/components/landing/MobileLandingClient";
import { Box } from "@mantine/core";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <>
      <Box visibleFrom="sm">
        <LandingClient isLoggedIn={!!session} />
      </Box>
      <Box hiddenFrom="sm">
        <MobileLandingClient isLoggedIn={!!session} />
      </Box>
    </>
  );
}
