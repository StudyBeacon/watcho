import { Play, Users, Video, MonitorPlay } from "lucide-react";

export default function ServersPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-bg-primary p-8">
      <div className="max-w-md text-center animate-fade-in">
        {/* Hero icon */}
        <div className="inline-flex h-20 w-20 rounded-3xl bg-accent items-center justify-center shadow-lg mb-6">
          <Play size={36} className="text-white fill-white ml-1" />
        </div>

        <h1 className="text-3xl font-semibold text-label mb-3">
          Welcome to WatchTogether
        </h1>
        <p className="text-[15px] text-label-secondary leading-relaxed mb-8">
          Create a server or join one with an invite code to start chatting,
          voice calling, and watching movies together with your friends.
        </p>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-bg-secondary">
            <Users size={24} className="text-accent" />
            <span className="text-[13px] text-label-secondary font-medium">
              Group Chat
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-bg-secondary">
            <Video size={24} className="text-accent" />
            <span className="text-[13px] text-label-secondary font-medium">
              Voice & Video
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-bg-secondary">
            <MonitorPlay size={24} className="text-accent" />
            <span className="text-[13px] text-label-secondary font-medium">
              Watch Parties
            </span>
          </div>
        </div>

        <p className="text-[13px] text-label-tertiary mt-8">
          Use the <span className="text-success">+</span> button to create a
          server or the{" "}
          <span className="text-accent">compass</span> button to join one.
        </p>
      </div>
    </div>
  );
}