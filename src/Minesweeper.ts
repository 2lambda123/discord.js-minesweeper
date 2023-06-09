/**
 * Minesweeper options.
 * @typedef {object} MinesweeperOpts
 * @property {number} [rows] - The number of rows in the mine field. Defaults to 9.
 * @property {number} [columns] - The number of columns in the mine field. Defaults to 9.
 * @property {number} [mines] - The number of mines in the mine field. Defaults to 10.
 * @property {string} [emote] - The emote used as a mine. Defaults to "boom".
 * @property {boolean} [revealFirstCell] - Whether or not the first cell should be revealed (like in regular Minesweeper). Defaults to FALSE.
 * @property {boolean} [zeroFirstCell] - Whether or not the first cell revealed should always be a zero (and automatically reveal any surrounding safe cells). Does nothing if `revealFirstCell` is false. Defaults to true.
 * @property {boolean} [spaces] - Specifies whether or not the emojis should be surrounded by spaces. Defaults to true.
 * @property {function} [rng] - Custom random number generator function. Must generate a number between 0 and 1. Defaults to Math.random().
 * @property {'emoji' | 'code' | 'matrix'} [returnType] - The type of the returned data. Defaults to "emoji".
 */
interface MinesweeperOpts {
  rows?: number;
  columns?: number;
  mines?: number;
  emote?: string;
  revealFirstCell?: boolean;
  zeroFirstCell?: boolean;
  spaces?: boolean;
  rng?: () => number;
  returnType?: 'emoji' | 'code' | 'matrix'; 
}

/**
 * Cell types.
 * @typedef {object} CellTypes
 * @property {string} mine - The definition of a mine string.
 * @property {string[]} numbers - The numbers as emote names.
 */
interface CellTypes {
  mine: string;
  numbers: string[];
}

/**
 * Safe cell. Defines the coordinates of a safe cell.
 * @typedef {object}SafeCell
 * @property {number} x - row id
 * @property {number} y - column id
 */
interface SafeCell {
  x: number;
  y: number;
}

class Minesweeper {
  public readonly rows: number;
  public readonly columns: number;
  public readonly mines: number;
  public readonly emote: string;
  public readonly spaces: boolean;
  public readonly revealFirstCell: boolean;
  public readonly zeroFirstCell: boolean;
  public readonly returnType: 'emoji' | 'code' | 'matrix';
  
  public rng: () => number;
  
  public readonly safeCells: SafeCell[] = [];
  public readonly types: CellTypes;
  public matrix: string[][];

  /**
   * The constructor of the Minesweeper class.
   * @constructor
   * @param {MinesweeperOpts} opts - The options of the Minesweeper class.
   */
  constructor(opts: MinesweeperOpts | undefined = undefined) {
    this.rows = opts?.rows || 9;
    this.columns = opts?.columns || 9;
    this.mines = opts?.mines || 10;
    this.emote = opts?.emote || 'boom';
    this.revealFirstCell = opts?.revealFirstCell ?? false;
    this.zeroFirstCell = opts?.zeroFirstCell ?? true;
    this.spaces = opts?.spaces ?? true;
    this.returnType = opts?.returnType || 'emoji';

    this.matrix = [];

    this.types = {
      mine: this.spoilerize(this.emote),
      numbers: [ 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight' ].map(n => this.spoilerize(n))
    };

    this.rng = opts?.rng ?? Math.random;
  }

  /**
   * Turns a text into a Discord spoiler.
   * @param {string} str - The string to spoilerize.
   * @returns {string}
   */
  spoilerize(str: string): string {
    return this.spaces
      ? `|| :${str}: ||`
      : `||:${str}:||`;
  }

  /**
   * Fills the matrix with "zero" emojis.
   */
  generateEmptyMatrix() {
    for (let i: number = 0; i < this.rows; i++) {
      const arr: string[] = new Array(this.columns).fill(this.types.numbers[0]);
      this.matrix.push(arr);
    }
  }

  /**
   * Plants mines in the matrix randomly.
   */
  plantMines() {
    for (let i: number = 0; i < this.mines; i++) {
      const x: number = Math.floor(this.rng() * this.rows);
      const y: number = Math.floor(this.rng() * this.columns);

      if (this.matrix[x][y] === this.types.mine) {
        i--;
      } else {
        this.matrix[x][y] = this.types.mine;
      }
    }
  }

  /**
   * Gets the number of mines in a particular (x, y) coordinate
   * of the matrix.
   * @param {number} x - The x coordinate (row).
   * @param {number} y - The y coordinate (column).
   * @returns {string}
   */
  getNumberOfMines(x: number, y: number): string {
    if (this.matrix[x][y] === this.types.mine) {
      return this.types.mine;
    }

    this.safeCells.push({ x, y });

    let counter: number = 0;
    const hasLeft = y > 0;
    const hasRight = y < (this.columns - 1);
    const hasTop = x > 0;
    const hasBottom = x < (this.rows - 1);

    // top left
    counter += +(hasTop && hasLeft && this.matrix[x - 1][y - 1] === this.types.mine);

    // top
    counter += +(hasTop && this.matrix[x - 1][y] === this.types.mine);

    // top right
    counter += +(hasTop && hasRight && this.matrix[x - 1][y + 1] === this.types.mine);

    // left
    counter += +(hasLeft && this.matrix[x][y - 1] === this.types.mine);

    // right
    counter += +(hasRight && this.matrix[x][y + 1] === this.types.mine);

    // bottom left
    counter += +(hasBottom && hasLeft && this.matrix[x + 1][y - 1] === this.types.mine);

    // bottom
    counter += +(hasBottom && this.matrix[x + 1][y] === this.types.mine);

    // bottom right
    counter += +(hasBottom && hasRight && this.matrix[x + 1][y + 1] === this.types.mine);

    return this.types.numbers[counter];
  }

  /**
   * Returns the Discord message equivalent of the mine field.
   * @returns {string}
   */
  getTextRepresentation(): string {
    const separator: string = this.spaces ? ' ' : '';
    return this.matrix.map(r => r.join(separator)).join('\n');
  }

  /**
   * Populates the matrix.
   */
  populate() {
    this.matrix = this.matrix.map((row, x) => {
      return row.map((col, y) => this.getNumberOfMines(x, y));
    });
  }

  /**
   * Reveal a random cell.
   * @returns {SafeCell}
   */
  revealFirst(): SafeCell {
    /**
     * Thanks to @FungiOfDeath and @TheSorton on Github for
     * bringing this up!
     */

    if (!this.revealFirstCell) {
      return { x: -1, y: -1 };
    }

    const zeroCells = this.safeCells.filter(c => this.matrix[c.x][c.y] === this.types.numbers[0]);
    if (this.zeroFirstCell && zeroCells.length > 0) {
      const safeCell: SafeCell = zeroCells[Math.floor(this.rng() * zeroCells.length)];

      const x: number = safeCell.x;
      const y: number = safeCell.y;

      const cell = this.matrix[x][y];

      this.matrix[x][y] = cell.slice(2, -2);
      this.revealSurroundings(safeCell);

      return { x, y };
    } else {
      const safeCell: SafeCell = this.safeCells[Math.floor(this.rng() * this.safeCells.length)];

      const x: number = safeCell.x;
      const y: number = safeCell.y;

      const cell = this.matrix[x][y];

      this.matrix[x][y] = cell.slice(2, -2);

      return { x, y };
    }
  }

  /**
   * Reveals all cells surrounding a cell. Only meant to be used for zero-cells during initial construction.
   * @param {SafeCell} c - A SafeCell to reveal around. This should only be a zero-cell!
   * @param {boolean} recurse - Whether to recursively reveal following zero-cells. Defaults to true.
   */
  revealSurroundings(c: SafeCell, recurse: boolean = true) {
    const isSpoiler = (x: number, y: number) => this.matrix[x][y].includes("||");
    const x = c.x;
    const y = c.y;

    const xLower = Math.max(0, x - 1);
    const yLower = Math.max(0, y - 1);
    const xUpper = Math.min(this.rows - 1, x + 1);
    const yUpper = Math.min(this.columns - 1, y + 1);
    let zeroCells: SafeCell[] = [];

    for (let i = xLower; i <= xUpper; i++) {
      for (let j = yLower; j <= yUpper; j++) {
        if (isSpoiler(i, j)) {
          if (this.matrix[i][j] === this.types.numbers[0]) {
            zeroCells.push({ x: i, y: j });
          }
          this.matrix[i][j] = this.matrix[i][j].slice(2, -2);
        }
      }
    }

    if (recurse) {
      zeroCells.forEach(c => this.revealSurroundings(c, true));
    }
  }

  /**
   * Generates a minesweeper mine field and returns it.
   * @returns {(string | string[][] | null)}
   */
  start(): string | string[][] | null {
    if (this.rows * this.columns <= this.mines * 2) {
      return null;
    }

    this.generateEmptyMatrix();
    this.plantMines();
    this.populate();
    this.revealFirst();

    switch (this.returnType) {
      case 'emoji':
        return this.getTextRepresentation();
      case 'code':
        return `\`\`\`${this.getTextRepresentation()}\`\`\``;
      case 'matrix':
        return this.matrix;
    }
  }
}

export = Minesweeper;
