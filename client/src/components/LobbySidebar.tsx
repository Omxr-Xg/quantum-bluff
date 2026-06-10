import type { RefObject } from "react";
import { DailyChallenges } from "./DailyChallenges";
import { FriendsList } from "./FriendsList";
import { DiscreteAdSlot } from "./ads/DiscreteAdSlot";

type LobbySidebarProps = {
  tourRefDaily: RefObject<HTMLDivElement | null>;
  tourRefFriends: RefObject<HTMLDivElement | null>;
};

export default function LobbySidebar({ tourRefDaily, tourRefFriends }: LobbySidebarProps) {
  return (
    <>
      <div ref={tourRefDaily} className="lg:max-h-[50%] lg:min-h-0 lg:flex lg:flex-col lg:overflow-y-auto">
        <DailyChallenges />
      </div>
      <div ref={tourRefFriends} className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <FriendsList />
      </div>
      <DiscreteAdSlot placement="lobby-sidebar" className="shrink-0 max-lg:mt-1" />
    </>
  );
}
