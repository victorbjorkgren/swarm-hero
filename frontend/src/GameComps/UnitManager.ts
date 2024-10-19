import {ParticleBase} from "./Entities/ParticleBase";
import {EntityBase} from "../types/types";
import {Units} from "../types/unitTypes";


export type UnitMap<TParticle extends ParticleBase> = Map<Units, Set<TParticle>>;
export type EntityUnitMap<TParticle extends ParticleBase> = Map<EntityBase, UnitMap<TParticle>>;
export type UnitCount = {unit: Units, count: number};

export class UnitManager<TParticle extends ParticleBase> {
    private unitMap: EntityUnitMap<TParticle> = new Map();

    add(obj: TParticle) {
        if (!obj.isAlive()) return;

        const element: Units = obj.unitInfo.element;
        const owner: EntityBase = obj.owner;

        let ownerParticles = this.unitMap.get(owner);
        if (!ownerParticles) {
            ownerParticles = new Map<Units, Set<TParticle>>();
            this.unitMap.set(owner, ownerParticles);
        }

        let elementSet = ownerParticles.get(element);
        if (!elementSet) {
            elementSet = new Set<TParticle>();
            ownerParticles.set(element, elementSet);
        }

        elementSet.add(obj);
    }

    remove(obj: TParticle) {
        const element: Units = obj.unitInfo.element;
        const owner: EntityBase = obj.owner;

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

    getMap(): EntityUnitMap<TParticle> {
        return this.unitMap;
    }

    getUnitCount(owner: EntityBase, element: Units): UnitCount {
        const n = this.unitMap.get(owner)?.get(element)?.size || 0
        return {unit: element, count: n};
    }

    getUnitCounts(owner: EntityBase | null): Set<UnitCount> {
        const out = new Set<UnitCount>();
        if (!owner) return out;
        const units = this.getOwnerUnits(owner);
        units.forEach((set, key) => {
            out.add({unit: key, count: set.size})
        })
        return out;
    }

    flatOwnerCount(owner: EntityBase): number {
        let n = 0;
        const units = this.getOwnerUnits(owner);
        units.forEach((set, _) => {
            n += set.size;
        })
        return n;
    }

    getUnits(owner: EntityBase, element: Units): Set<TParticle> | null {
        return this.unitMap.get(owner)?.get(element) || null;
    }

    getOwnerUnits(owner: EntityBase): UnitMap<TParticle> {
        return this.unitMap.get(owner) || new Map();
    }

    ownerForEach(owner: EntityBase, callback: (particle: TParticle) => void): void {
        const m = this.unitMap.get(owner)
        if (m) {
            m.forEach((set) => {
                set.forEach(callback);
            })
        }

    }

    deepForEach(callback: (particle: TParticle)=>void): void {
        this.unitMap.forEach((unitMap) => {
            unitMap.forEach((set)=>{
                set.forEach(callback)
            })
        })
    }

    switchOwner(particle: TParticle, newOwner: EntityBase) {
        this.remove(particle);
        particle.owner = newOwner;
        this.add(particle);
    }
}