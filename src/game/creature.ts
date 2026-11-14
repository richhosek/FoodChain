export type Level = 0 | 1 | 2 | 3 | 4;
export type RandomSource = () => number;
export interface Position { row: number; col: number }
export interface Creature { id: string; level: Level }
export type Board = Array<Array<Creature | null>>;
export interface LocatedCreature { position: Position; creature: Creature }
export interface Movement { creature: Creature; from: Position | null; to: Position }
export interface Reaction { prey: LocatedCreature; predators: LocatedCreature[] }
export interface ReactionWave {
  before: Board;
  after: Board;
  reactions: Reaction[];
  removed: LocatedCreature[];
  creations: LocatedCreature[];
  explosionCells: Position[];
  apex: boolean;
}
export interface RefillResult { board: Board; movements: Movement[]; candidates: Position[] }
export type CreatureFactory = (level: Level) => Creature;