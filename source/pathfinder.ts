import { ALPosition } from "./definitions/adventureland";
let PF = require("pathfinding")

export class Pathfinder {
    /**
     * A number that determines the scale of the grid to the actual map
     */
    private factor: number;
    /**
     * Number(s) that indicate how much padding to give to walls.
     */
    private padding: number;

    private grids: any = {};

    constructor(factor: number = 4, padding: number = 4) {
        this.factor = factor;
        this.padding = padding;
    }

    public findNextMovement(from: ALPosition, to: ALPosition): ALPosition {
        if (from.map && to.map && from.map != to.map) {
            game_log("Cross map pathfinding is not yet supported!");
            return;
        }
        if (!from.map) from.map = character.map; // Use the map on the character
        let mapName = from.map;


        if (!this.grids[from.map]) this.prepareMap(from.map); // Prepare the map if we haven't prepared it yet.
        let grid = this.grids[from.map].clone();

        let finder = new PF.AStarFinder({
            diagonalMovement: PF.DiagonalMovement.OnlyWhenNoObstacles
        });

        let path = finder.findPath(Math.floor(Math.abs(from.x - G.geometry[mapName].min_x) / this.factor), Math.floor((Math.abs(from.y - G.geometry[mapName].min_y)) / this.factor), Math.floor((Math.abs(to.x - G.geometry[mapName].min_x)) / this.factor), Math.floor((Math.abs(to.y - G.geometry[mapName].min_y)) / this.factor), grid);
        let newPath = PF.Util.smoothenPath(grid, path);

        if(!newPath) return; // Failed finding a path...

        return { x: G.geometry[mapName].min_x + (newPath[1][0] * this.factor), y: G.geometry[mapName].min_y + (newPath[1][1] * this.factor) };
    }

    public prepareMap(mapName: string) {
        if (this.grids[mapName]) return; // Already generated

        let width = G.geometry[mapName].max_x - G.geometry[mapName].min_x;
        let height = G.geometry[mapName].max_y - G.geometry[mapName].min_y;

        let grid = new PF.Grid(Math.floor(width / this.factor), Math.floor(height / this.factor));

        // Add the horizontal lines as walls
        G.geometry[mapName].x_lines.forEach((line) => {
            for (let y = Math.floor(Math.max(0, line[1] - G.geometry[mapName].min_y - this.padding) / this.factor); y <= Math.ceil(Math.min(height, line[2] - G.geometry[mapName].min_y + this.padding) / this.factor); y++) {
                let x = (line[0] - G.geometry[mapName].min_x) / this.factor
                grid.setWalkableAt(Math.floor(x), y, false)
                grid.setWalkableAt(Math.ceil(x), y, false)
            }
        })

        // Add the vertical lines as walls
        G.geometry[mapName].y_lines.forEach((line) => {
            for (let x = Math.floor(Math.max(0, line[1] - G.geometry[mapName].min_x - this.padding) / this.factor); x <= Math.ceil(Math.min(width, line[2] - G.geometry[mapName].min_x + this.padding) / this.factor); x++) {
                let y = (line[0] - G.geometry[mapName].min_y) / this.factor
                grid.setWalkableAt(x, Math.floor(y), false)
                grid.setWalkableAt(x, Math.ceil(y), false)
            }
        })
        this.grids[mapName] = grid.clone();
    }
}