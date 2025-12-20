// utils/maze-generator.ts

export type CellType = 'wall' | 'path' | 'start' | 'end';
export type PathType = 'solution' | 'dead-end' | 'none';

export interface MazeCell {
  x: number;
  y: number;
  type: CellType;
  pathType: PathType;
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

  // Helper to check bounds
  const isValid = (x: number, y: number) => x > 0 && x < SIZE - 1 && y > 0 && y < SIZE - 1;

  // 2. Generate "Solution Path" (The Safe Leaf Road)
  // We use a biased random walk from Top-Left to Bottom-Right
  let currentX = 1;
  let currentY = 1;
  const endX = SIZE - 2;
  const endY = SIZE - 2;

  // Mark Start
  grid[1][1] = { x: 1, y: 1, type: 'start', pathType: 'solution' };
  
  const solutionPath: {x: number, y: number}[] = [{x: 1, y: 1}];

  // Force a path to the end
  while (currentX !== endX || currentY !== endY) {
    let moves = [];
    // Bias towards the exit (Down/Right)
    if (currentX < endX) moves.push({ x: currentX + 1, y: currentY });
    if (currentY < endY) moves.push({ x: currentX, y: currentY + 1 });
    
    // Small chance to go Back/Up (makes it winding)
    if (currentX > 1 && Math.random() > 0.85) moves.push({ x: currentX - 1, y: currentY });
    if (currentY > 1 && Math.random() > 0.85) moves.push({ x: currentX, y: currentY - 1 });

    // Filter invalid moves (out of bounds)
    moves = moves.filter(m => isValid(m.x, m.y));

    // If stuck (rare), force move towards end
    if (moves.length === 0) {
        if (currentX < endX) moves.push({ x: currentX + 1, y: currentY });
        else if (currentY < endY) moves.push({ x: currentX, y: currentY + 1 });
    }

    const move = moves[Math.floor(Math.random() * moves.length)];
    currentX = move.x;
    currentY = move.y;

    grid[currentX][currentY] = { 
        x: currentX, 
        y: currentY, 
        type: 'path', 
        pathType: 'solution' 
    };
    solutionPath.push({x: currentX, y: currentY});
  }

  // Mark End
  grid[endX][endY] = { x: endX, y: endY, type: 'end', pathType: 'solution' };

  // 3. Generate "Dead Ends" (The Dangerous Circle Traps)
  // Branch off the main path to create false turns
  solutionPath.forEach(cell => {
    // 40% chance to spawn a branch at any step
    if (Math.random() > 0.6) { 
      const neighbors = [
        { x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y },
        { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 }
      ];

      neighbors.forEach(n => {
        // If it's currently a wall, turn it into a dead end
        if (isValid(n.x, n.y) && grid[n.x][n.y].type === 'wall') {
           grid[n.x][n.y] = { x: n.x, y: n.y, type: 'path', pathType: 'dead-end' };
           
           // Chance to extend the dead end by 1 block (to make it tricky)
           const extension = { x: n.x + (n.x - cell.x), y: n.y + (n.y - cell.y) };
           if (isValid(extension.x, extension.y) && Math.random() > 0.5 && grid[extension.x][extension.y].type === 'wall') {
               grid[extension.x][extension.y] = { x: extension.x, y: extension.y, type: 'path', pathType: 'dead-end' };
           }
        }
      });
    }
  });

  return { grid, start: {x: 1, y: 1}, end: {x: endX, y: endY} };
}