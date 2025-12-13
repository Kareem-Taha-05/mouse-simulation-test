// utils/maze-generator.ts

export type CellType = 'wall' | 'path' | 'start' | 'end';
export type PathType = 'solution' | 'dead-end' | 'none';

export interface MazeCell {
  x: number;
  y: number;
  type: CellType;
  pathType: PathType; // Is this cell part of the winning path?
}

const SIZE = 15; // 15x15 Maze

export function generateMaze() {
  // 1. Initialize Grid with Walls
  let grid: MazeCell[][] = [];
  for (let x = 0; x < SIZE; x++) {
    grid[x] = [];
    for (let y = 0; y < SIZE; y++) {
      grid[x][y] = { x, y, type: 'wall', pathType: 'none' };
    }
  }

  // 2. Helper to check bounds
  const isValid = (x: number, y: number) => x > 0 && x < SIZE - 1 && y > 0 && y < SIZE - 1;

  // 3. Generate "Solution Path" (Random Walk from Top-Left to Bottom-Right)
  // We use a simple "Drunken Walk" that biases towards the exit
  let currentX = 1;
  let currentY = 1;
  const endX = SIZE - 2;
  const endY = SIZE - 2;

  grid[1][1] = { x: 1, y: 1, type: 'start', pathType: 'solution' };
  
  const solutionPath: {x: number, y: number}[] = [{x: 1, y: 1}];

  while (currentX !== endX || currentY !== endY) {
    // Determine possible moves
    let moves = [];
    if (currentX < endX) moves.push({ x: currentX + 1, y: currentY });
    if (currentY < endY) moves.push({ x: currentX, y: currentY + 1 });
    // Small chance to go back/up to make it winding, but mostly forward
    if (currentX > 1 && Math.random() > 0.8) moves.push({ x: currentX - 1, y: currentY });
    if (currentY > 1 && Math.random() > 0.8) moves.push({ x: currentX, y: currentY - 1 });

    // Pick a random move
    const move = moves[Math.floor(Math.random() * moves.length)];
    currentX = move.x;
    currentY = move.y;

    // Mark as solution
    grid[currentX][currentY].type = 'path';
    grid[currentX][currentY].pathType = 'solution';
    solutionPath.push({x: currentX, y: currentY});
  }

  // Mark End
  grid[endX][endY].type = 'end';

  // 4. Generate "Dead Ends" (Fake paths branching off the solution)
  // We iterate through the solution path and randomly dig sideways
  solutionPath.forEach(cell => {
    if (Math.random() > 0.4) { // 60% chance to spawn a dead end branch
      const neighbors = [
        { x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y },
        { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 }
      ];

      neighbors.forEach(n => {
        if (isValid(n.x, n.y) && grid[n.x][n.y].type === 'wall') {
           grid[n.x][n.y] = { x: n.x, y: n.y, type: 'path', pathType: 'dead-end' };
           // Maybe extend it by 1 more block
           if (isValid(n.x+1, n.y) && Math.random() > 0.5) grid[n.x+1][n.y] = { ...grid[n.x+1][n.y], type: 'path', pathType: 'dead-end' };
        }
      });
    }
  });

  return { grid, start: {x: 1, y: 1}, end: {x: endX, y: endY} };
}