export type ConnectionPersona = 'guest' | 'female' | 'male' | 'nonbinary';

export interface ConnectionPolicy {
  persona: ConnectionPersona;
  canConnect: boolean;
  unlimited: boolean;
  costsWick: boolean;
  freeRemaining: number;
}

/**
 * One source of truth for the three materially different access journeys.
 * Vigil is an entitlement layered on a registered persona, while guests stay
 * browse-only regardless of the profile values cached on their device.
 */
export function connectionPolicy(params: {
  guest: boolean;
  vigil: boolean;
  gender: 'female' | 'male' | 'nonbinary' | null;
  connectionsToday: number;
  wicks: number;
  dailyAllowance?: number;
  wickCost?: number;
}): ConnectionPolicy {
  const dailyAllowance = params.dailyAllowance ?? 10;
  const wickCost = params.wickCost ?? 1;
  const persona: ConnectionPersona = params.guest
    ? 'guest'
    : params.gender === 'female'
      ? 'female'
      : params.gender === 'male'
        ? 'male'
        : 'nonbinary';

  if (params.guest) {
    return { persona, canConnect: false, unlimited: false, costsWick: false, freeRemaining: 0 };
  }
  if (params.vigil || params.gender === 'female') {
    return { persona, canConnect: true, unlimited: true, costsWick: false, freeRemaining: 0 };
  }

  const freeRemaining = Math.max(0, dailyAllowance - params.connectionsToday);
  const costsWick = freeRemaining === 0;
  return {
    persona,
    canConnect: freeRemaining > 0 || params.wicks >= wickCost,
    unlimited: false,
    costsWick,
    freeRemaining,
  };
}
