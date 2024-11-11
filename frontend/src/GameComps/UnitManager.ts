import {ParticleInterface} from "./Entities/Particle";
import {Units} from "../types/unitTypes";
import {EntityID, ParticleID} from "@shared/commTypes";


export type UnitMap<TParticle extends ParticleInterface> = Map<Units, Set<TParticle>>;
export type EntityUnitMap<TParticle extends ParticleInterface> = Map<EntityID | null, UnitMap<TParticle>>;
export type IdMap<TParticle extends ParticleInterface> = Map<ParticleID, TParticle>;
export type UnitCount = {unit: Units, count: number};

export class UnitManager<TParticle extends ParticleInterface> {
    private unitMap: EntityUnitMap<TParticle> = new Map();
    private idMap: IdMap<TParticle> = new Map();

    add(obj: TParticle) {
        if (!obj.state.isAlive()) return;

        this.idMap.set(obj.state.id, obj);

        const element: Units = obj.state.unitInfo.element;
        const owner: EntityID | null = obj.state.owner;

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
        this.idMap.delete(obj.state.id);

        const element: Units = obj.state.unitInfo.element;
        const owner: EntityID | null = obj.state.owner;

        const ownerParticles = this.unitMap.get(owner);
        const elementSet = ownerParticles?.get(element);

        if (elementSet) {
            elementSet.delete(obj);
            if (elementSet.size === 0) {
                ownerParticles?.delete(element);
            }
            if (ownerParticles?.size === 0) {
                this.unitMap.delete(owner);
            }
        }
    }

    getById(id: ParticleID): TParticle | undefined {
        return this.idMap.get(id);
    }

    getMap(): EntityUnitMap<TParticle> {
        return this.unitMap;
    }

    getUnitCount(owner: EntityID, element: Units): UnitCount {
        const n = this.unitMap.get(owner)?.get(element)?.size || 0
        return {unit: element, count: n};
    }

    getUnitCounts(owner: EntityID | null): Set<UnitCount> {
        const out = new Set<UnitCount>();
        if (!owner) return out;
        const units = this.getOwnerUnits(owner);
        units.forEach((set, key) => {
            out.add({unit: key, count: set.size})
        })
        return out;
    }

    flatOwnerCount(owner: EntityID): number {
        let n = 0;
        const units = this.getOwnerUnits(owner);
        units.forEach((set, _) => {
            n += set.size;
        })
        return n;
    }

    getUnits(owner: EntityID, element: Units): Set<TParticle> | null {
        return this.unitMap.get(owner)?.get(element) || null;
    }

    getOwnerUnits(owner: EntityID): UnitMap<TParticle> {
        return this.unitMap.get(owner) || new Map();
    }

    ownerForEach(owner: EntityID | null, callback: (particle: TParticle) => void): void {
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

    switchOwner(particle: TParticle, newOwner: EntityID) {
        this.remove(particle);
        particle.state.owner = newOwner;
        this.add(particle);
    }
}