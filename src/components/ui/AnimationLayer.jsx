// --- AnimationLayer ---
// Renders all in-game animations and visual effects as an overlay.
// Pure render component — no state or effects.

import React from 'react';
import FlyingDrone from '../animations/FlyingDrone.jsx';
import FlashEffect from '../animations/FlashEffect.jsx';
import HealEffect from '../animations/HealEffect.jsx';
import CardVisualEffect from '../animations/CardVisualEffect.jsx';
import CardRevealOverlay from '../animations/CardRevealOverlay.jsx';
import ShipAbilityRevealOverlay from '../animations/ShipAbilityRevealOverlay.jsx';
import PassNotificationOverlay from '../animations/PassNotificationOverlay.jsx';
import GoAgainOverlay from '../animations/GoAgainOverlay.jsx';
import TriggerFiredOverlay from '../animations/TriggerFiredOverlay.jsx';
import StatusConsumptionOverlay from '../animations/StatusConsumptionOverlay.jsx';
import CardWarningOverlay from '../animations/CardWarningOverlay.jsx';
import PhaseAnnouncementOverlay from '../animations/PhaseAnnouncementOverlay.jsx';
import LaserEffect from '../animations/LaserEffect.jsx';
import TeleportEffect from '../animations/TeleportEffect.jsx';
import OverflowProjectile from '../animations/OverflowProjectile.jsx';
import SplashEffect from '../animations/SplashEffect.jsx';
import BarrageImpact from '../animations/BarrageImpact.jsx';
import RailgunTurret from '../animations/RailgunTurret.jsx';
import RailgunBeam from '../animations/RailgunBeam.jsx';
import ExplosionEffect from '../animations/ExplosionEffect.jsx';

const AnimationLayer = ({
  explosions,
  flyingDrones,
  flashEffects,
  healEffects,
  cardVisuals,
  cardReveals,
  statusConsumptions,
  shipAbilityReveals,
  phaseAnnouncements,
  passNotifications,
  goAgainNotifications,
  triggerFiredNotifications,
  cardPlayWarning,
  laserEffects,
  teleportEffects,
  overflowProjectiles,
  splashEffects,
  barrageImpacts,
  railgunTurrets,
  railgunBeams,
  animationBlocking,
  setBarrageImpacts,
}) => (
  <>
    {explosions.map(exp => <ExplosionEffect key={exp.id} top={exp.top} left={exp.left} size={exp.size} />)}
    {flyingDrones.map(fd => (
      <FlyingDrone
        key={fd.id}
        droneData={fd.droneData}
        startPos={fd.startPos}
        endPos={fd.endPos}
        config={fd.config}
        onComplete={fd.onComplete}
      />
    ))}
    {flashEffects.map(flash => (
      <FlashEffect
        key={flash.id}
        position={flash.position}
        color={flash.color}
        intensity={flash.intensity}
        onComplete={flash.onComplete}
      />
    ))}
    {healEffects.map(heal => (
      <HealEffect
        key={heal.id}
        position={heal.position}
        healAmount={heal.healAmount}
        onComplete={heal.onComplete}
      />
    ))}
    {cardVisuals.map(visual => (
      <CardVisualEffect
        key={visual.id}
        visualType={visual.visualType}
        startPos={visual.startPos}
        endPos={visual.endPos}
        duration={visual.duration}
        onComplete={visual.onComplete}
      />
    ))}
    {cardReveals.map(reveal => (
      <CardRevealOverlay
        key={reveal.id}
        card={reveal.card}
        label={reveal.label}
        onComplete={reveal.onComplete}
      />
    ))}
    {statusConsumptions.map(consumption => (
      <StatusConsumptionOverlay
        key={consumption.id}
        label={consumption.label}
        droneName={consumption.droneName}
        statusType={consumption.statusType}
        onComplete={consumption.onComplete}
      />
    ))}
    {shipAbilityReveals.map(reveal => (
      <ShipAbilityRevealOverlay
        key={reveal.id}
        abilityName={reveal.abilityName}
        label={reveal.label}
        onComplete={reveal.onComplete}
      />
    ))}
    {phaseAnnouncements.map(announcement => (
      <PhaseAnnouncementOverlay
        key={announcement.id}
        phaseText={announcement.phaseText}
        subtitle={announcement.subtitle}
        onComplete={announcement.onComplete}
      />
    ))}
    {passNotifications.map(notification => (
      <PassNotificationOverlay
        key={notification.id}
        label={notification.label}
        onComplete={notification.onComplete}
      />
    ))}
    {goAgainNotifications.map(notification => (
      <GoAgainOverlay
        key={notification.id}
        label={notification.label}
        isLocalPlayer={notification.isLocalPlayer}
        onComplete={notification.onComplete}
      />
    ))}
    {triggerFiredNotifications.map(notification => (
      <TriggerFiredOverlay
        key={notification.id}
        droneName={notification.droneName}
        abilityName={notification.abilityName}
        onComplete={notification.onComplete}
      />
    ))}
    {cardPlayWarning && (
      <CardWarningOverlay
        key={cardPlayWarning.id}
        reasons={cardPlayWarning.reasons}
      />
    )}
    {laserEffects.map(laser => (
      <LaserEffect
        key={laser.id}
        startPos={laser.startPos}
        endPos={laser.endPos}
        attackValue={laser.attackValue}
        duration={laser.duration}
        onComplete={laser.onComplete}
      />
    ))}
    {teleportEffects.map(teleport => (
      <TeleportEffect
        key={teleport.id}
        top={teleport.top}
        left={teleport.left}
        color={teleport.color}
        duration={teleport.duration}
        onComplete={teleport.onComplete}
      />
    ))}
    {overflowProjectiles.map(projectile => (
      <OverflowProjectile
        key={projectile.id}
        startPos={projectile.startPos}
        dronePos={projectile.dronePos}
        shipPos={projectile.shipPos}
        hasOverflow={projectile.hasOverflow}
        isPiercing={projectile.isPiercing}
        duration={projectile.duration}
        onComplete={projectile.onComplete}
      />
    ))}
    {splashEffects.map(splash => (
      <SplashEffect
        key={splash.id}
        centerPos={splash.centerPos}
        duration={splash.duration}
        onComplete={splash.onComplete}
      />
    ))}
    {barrageImpacts.map(impact => (
      <BarrageImpact
        key={impact.id}
        position={impact.position}
        size={impact.size}
        delay={impact.delay}
        onComplete={() => {
          setBarrageImpacts(prev => prev.filter(i => i.id !== impact.id));
        }}
      />
    ))}
    {railgunTurrets.map(turret => (
      <div
        key={turret.id}
        style={{
          position: 'fixed',
          left: turret.position.x,
          top: turret.position.y,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 9999
        }}
      >
        <RailgunTurret
          rotation={turret.rotation}
          onComplete={turret.onComplete}
        />
      </div>
    ))}
    {railgunBeams.map(beam => (
      <RailgunBeam
        key={beam.id}
        startPos={beam.startPos}
        endPos={beam.endPos}
        attackValue={beam.attackValue}
        duration={beam.duration}
        onComplete={beam.onComplete}
      />
    ))}
    {animationBlocking && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          cursor: 'not-allowed',
          pointerEvents: 'all',
          backgroundColor: 'transparent'
        }}
      />
    )}
  </>
);

export default AnimationLayer;
