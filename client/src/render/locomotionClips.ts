import * as THREE from "three";

const srcQuat = new THREE.Quaternion();
const scaledQuat = new THREE.Quaternion();

export interface WalkLocomotionDamping {
  /** Fraction of arm-right walk swing kept after dampening. */
  readonly armRightSwing: number;
  /** Fraction of head walk sway kept after dampening. */
  readonly headSwing: number;
}

/** Scale a bone's quaternion track toward identity; retainFactor 0 = full dampening. */
export function dampBoneRotationTracks(
  clip: THREE.AnimationClip,
  boneName: string,
  retainFactor: number,
): void {
  for (const track of clip.tracks) {
    if (!track.name.startsWith(`${boneName}.`)) continue;
    if (!(track instanceof THREE.QuaternionKeyframeTrack)) continue;

    const { values } = track;
    for (let i = 0; i < values.length; i += 4) {
      srcQuat.fromArray(values, i);
      scaledQuat.identity().slerp(srcQuat, retainFactor);
      scaledQuat.toArray(values, i);
    }
  }
}

export function makeDampedWalkLocomotionClip(
  source: THREE.AnimationClip,
  reference: THREE.AnimationClip,
  damping: WalkLocomotionDamping,
): THREE.AnimationClip {
  const clip = THREE.AnimationUtils.makeClipAdditive(source.clone(), 0, reference);
  dampBoneRotationTracks(clip, "arm-right", damping.armRightSwing);
  dampBoneRotationTracks(clip, "head", damping.headSwing);
  return clip;
}