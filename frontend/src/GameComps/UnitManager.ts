import {ParticleBase} from "./Entities/ParticleBase";
import {Entity} from "../types/types";
import {Units} from "../types/unitTypes";

export type UnitMap = Map<Units, Set<ParticleBase>>;
export type EntityUnitMap = Map<Entity, UnitMap>;
export type UnitCount = {unit: Units, count: number};

export class UnitManager {
    private unitMap: EntityUnitMap = new Map();

    add(obj: ParticleBase) {
        if (!obj.isAlive()) return;

        const element: Units = obj.unitInfo.element;
        const owner: Entity = obj.owner;

        let ownerParticles = this.unitMap.get(owner);
        if (!ownerParticles) {
            ownerParticles = new Map<Units, Set<ParticleBase>>();
            this.unitMap.set(owner, ownerParticles);
        }

        let elementSet = ownerParticles.get(element);
        if (!elementSet) {
            elementSet = new Set<ParticleBase>();
            ownerParticles.set(element, elementSet);
        }

        elementSet.add(obj);
    }

    remove(obj: ParticleBase) {
        const element: Units = obj.unitInfo.element;
        const owner: Entity = obj.owner;

        const ownerParticles = this.unitMap.get(owner);
        const elementSet = ownerParticles?.get(element);

        // If the element set exists, remove the object
        if (elementSet) {
            elementSet.delete(obj);

            // If the set is now empty, remove the element map
            if (elementSet.size === 0) {
                ownerParticles?.delete(element);
            }

            // If the owner's particle map is empty, remove the owner entry
            if (ownerParticles?.size === 0) {
                this.unitMap.delete(owner);
            }
        }
    }

    getMap(): EntityUnitMap {
        return this.unitMap;
    }

    getUnitCount(owner: Entity, element: Units): UnitCount {
        const n = this.unitMap.get(owner)?.get(element)?.size || 0
        return {unit: element, count: n};
    }

    getUnitCounts(owner: Entity | null): Set<UnitCount> {
        const out = new Set<UnitCount>();
        if (!owner) return out;
        const units = this.getOwnerUnits(owner);
        units.forEach((set, key) => {
            out.add({unit: key, count: set.size})
        })
        return out;
    }

    flatOwnerCount(owner: Entity): number {
        let n = 0;
        const units = this.getOwnerUnits(owner);
        units.forEach((set, _) => {
            n += set.size;
        })
        return n;
    }

    getUnits(owner: Entity, element: Units): Set<ParticleBase> | null {
        return this.unitMap.get(owner)?.get(element) || null;
    }

    getOwnerUnits(owner: Entity): UnitMap {
        return this.unitMap.get(owner) || new Map();
    }

    ownerForEach(owner: Entity, callback: (particle: ParticleBase) => void): void {
        const m = this.unitMap.get(owner)
        if (m) {
            m.forEach((set) => {
                set.forEach(callback);
            })
        }

    }

    deepForEach(callback: (particle: ParticleBase)=>void): void {
        this.unitMap.forEach((unitMap) => {
            unitMap.forEach((set)=>{
                set.forEach(callback)
            })
        })
    }

    switchOwner(particle: ParticleBase, newOwner: Entity) {
        this.remove(particle);
        particle.owner = newOwner;
        this.add(particle);
    }
}