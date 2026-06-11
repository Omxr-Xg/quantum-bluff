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
      <div ref={tourRefDaily} className="shrink-0">
        <DailyChallenges />
      </div>
      <div ref={tourRefFriends} className="shrink-0">
        <FriendsList />
      </div>
      <DiscreteAdSlot placement="lobby-sidebar" className="shrink-0 max-lg:mt-1" />
    </>
  );
}
