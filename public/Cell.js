function Cell(i, j, walls) {
    this.i = i;
    this.j = j;
    this.walls = walls || [true, true, true, true];
    this.id = i*cols + (j+1);
    this.isFinished = false; // TRUE IF ALL NEIGHBORS ARE IN SAME SET
    
    this.isUnioned = function(neighbor) {
      for (var i = 0; i < sets.length; i++) {
       if (sets[i].includes(this.id) && sets[i].includes(neighbor.id)) {
         return true;
       }
      }
      return false;
    }
  
    this.randomNeighbor = function() {
      var neighbors = [];
  
      var top    = grid[index(i, j -1)];
      var right  = grid[index(i+1, j)];
      var bottom = grid[index(i, j+1)];
      var left   = grid[index(i-1, j)];
  
      if (this.walls[0] && top && !this.isUnioned(top)) {
        neighbors.push(top);
      }
      if (this.walls[1] && right && !this.isUnioned(right)) {
        neighbors.push(right);
      }
      if (this.walls[2] && bottom && !this.isUnionedbottom) {
        neighbors.push(bottom);
      }
      if (this.walls[3] && left && !this.isUnioned(left)) {
        neighbors.push(left);
      }
  
      if (neighbors.length > 0) {
        var r = floor(random(0, neighbors.length));
        return neighbors[r];
      } else {
        return undefined;
      }
  
  
    }
    this.highlight = function(isRed) {
      var x = this.i*w;
      var y = this.j*w;
      noStroke();
      isRed ? fill('red') : fill(0, 0, 255, 100);
      isRed ? rect(x+2, y+2, w-4, w-4) : rect(x, y, w, w);
  
    }
  
    this.show = function() {
      var x = this.i*w;
      var y = this.j*w;
      stroke(255);
      if (this.walls[0]) {
        line(x    , y    , x + w, y);
      }
      if (this.walls[1]) {
        line(x + w, y    , x + w, y + w);
      }
      if (this.walls[2]) {
        line(x + w, y + w, x    , y + w);
      }
      if (this.walls[3]) {
        line(x    , y + w, x    , y);
      }
  
      if (this.visited) {
        noStroke();
        fill(255, 0, 255, 100);
        rect(x, y, w, w);
      }
    }
  }
  