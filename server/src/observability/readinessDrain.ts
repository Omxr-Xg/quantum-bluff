/** Quand true, `/api/health/ready` renvoie 503 pour retirer l’instance du load balancer (rolling restart). */
let draining = false

export function setDraining(value: boolean): void {
  draining = value
}

export function isDraining(): boolean {
  return draining
}
