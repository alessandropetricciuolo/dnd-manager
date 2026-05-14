import { GmRemoteJoinClient } from "./gm-remote-join-client";

export const metadata = {
  title: "Telecomando GM | Barber and Dragons",
  robots: { index: false, follow: false },
};

export default function GmRemoteJoinPage({ params }: { params: { publicId: string } }) {
  return <GmRemoteJoinClient publicId={params.publicId} />;
}
