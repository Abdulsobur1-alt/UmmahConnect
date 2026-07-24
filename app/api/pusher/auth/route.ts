import { auth } from "@clerk/nextjs/server";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const data = await req.formData();
  const socketId = data.get("socket_id") as string;
  const channel = data.get("channel_name") as string;

  // Only allow users to subscribe to their own private channel
  if (channel !== `private-user-${userId}`) {
    return new Response("Forbidden", { status: 403 });
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channel);
  return Response.json(authResponse);
}
