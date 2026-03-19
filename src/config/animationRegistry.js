// ========================================
// ANIMATION REGISTRY
// ========================================
// Flat mapping from animation channel name to React component.
// AnimationLayer iterates this to render all active animations.
// Adding a new animation type: add it here + in INITIAL_ANIMATION_STATE.

import FlyingDrone from '../components/animations/FlyingDrone.jsx';
import FlashEffect from '../components/animations/FlashEffect.jsx';
import HealEffect from '../components/animations/HealEffect.jsx';
import StatBuffEffect from '../components/animations/StatBuffEffect.jsx';
import CardVisualEffect from '../components/animations/CardVisualEffect.jsx';
import CardRevealOverlay from '../components/animations/CardRevealOverlay.jsx';
import ShipAbilityRevealOverlay from '../components/animations/ShipAbilityRevealOverlay.jsx';
import PhaseAnnouncementOverlay from '../components/animations/PhaseAnnouncementOverlay.jsx';
import LaserEffect from '../components/animations/LaserEffect.jsx';
import TeleportEffect from '../components/animations/TeleportEffect.jsx';
import OverflowProjectile from '../components/animations/OverflowProjectile.jsx';
import SplashEffect from '../components/animations/SplashEffect.jsx';
import BarrageImpact from '../components/animations/BarrageImpact.jsx';
import RailgunTurret from '../components/animations/RailgunTurret.jsx';
import RailgunBeam from '../components/animations/RailgunBeam.jsx';
import PassNotificationOverlay from '../components/animations/PassNotificationOverlay.jsx';
import GoAgainOverlay from '../components/animations/GoAgainOverlay.jsx';
import TriggerFiredOverlay from '../components/animations/TriggerFiredOverlay.jsx';
import MovementBlockedOverlay from '../components/animations/MovementBlockedOverlay.jsx';
import StatusConsumptionOverlay from '../components/animations/StatusConsumptionOverlay.jsx';

export const ANIMATION_REGISTRY = {
  flyingDrones: FlyingDrone,
  flashEffects: FlashEffect,
  healEffects: HealEffect,
  statChangeEffects: StatBuffEffect,
  cardVisuals: CardVisualEffect,
  cardReveals: CardRevealOverlay,
  shipAbilityReveals: ShipAbilityRevealOverlay,
  phaseAnnouncements: PhaseAnnouncementOverlay,
  laserEffects: LaserEffect,
  teleportEffects: TeleportEffect,
  overflowProjectiles: OverflowProjectile,
  splashEffects: SplashEffect,
  barrageImpacts: BarrageImpact,
  railgunTurrets: RailgunTurret,
  railgunBeams: RailgunBeam,
  passNotifications: PassNotificationOverlay,
  goAgainNotifications: GoAgainOverlay,
  triggerFiredNotifications: TriggerFiredOverlay,
  movementBlockedNotifications: MovementBlockedOverlay,
  statusConsumptions: StatusConsumptionOverlay,
};
