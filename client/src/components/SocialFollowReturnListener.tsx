import { useSocialFollowReturn } from "../hooks/useSocialFollowReturn";

/** Écoute le retour sur l'app après une visite réseau social (défis hebdo). */
export function SocialFollowReturnListener() {
  useSocialFollowReturn();
  return null;
}
