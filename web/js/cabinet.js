/**
 * Athlete Cabinet and Self-contained SVG QR Code Generator
 */
import { CURRENT_ATHLETE } from './data.js';

export function getAthleteData() {
  const saved = localStorage.getItem('gto_athlete_profile');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved athlete data, using defaults');
    }
  }
  return { ...CURRENT_ATHLETE };
}

export function saveAthleteData(athlete) {
  localStorage.setItem('gto_athlete_profile', JSON.stringify(athlete));
}

/**
 * Generate a visual SVG QR Code pattern without external libraries
 */
export function generateSvgQrCode(text, size = 160) {
  // Simple deterministic hash-based 21x21 grid representation with standard QR finder patterns
  const matrixSize = 21;
  const matrix = Array(matrixSize).fill(0).map(() => Array(matrixSize).fill(0));

  // Add standard QR Corner Finder Patterns (7x7)
  function addFinder(r, c) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          matrix[r + i][c + j] = 1;
        }
      }
    }
  }

  addFinder(0, 0);
  addFinder(0, matrixSize - 7);
  addFinder(matrixSize - 7, 0);

  // Add timing patterns
  for (let i = 8; i < matrixSize - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Generate deterministic data modules based on text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  let bitIndex = 0;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Skip finders and separators
      if ((r < 8 && c < 8) || (r < 8 && c >= matrixSize - 8) || (r >= matrixSize - 8 && c < 8)) {
        continue;
      }
      if (r === 6 || c === 6) continue;

      // Pseudo-random bit based on position and text hash
      const bit = Math.abs(Math.sin(hash + (r * matrixSize + c) * 31)) > 0.48 ? 1 : 0;
      matrix[r][c] = bit;
      bitIndex++;
    }
  }

  // Build SVG path
  const cellSize = size / matrixSize;
  let rects = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c] === 1) {
        rects += `<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(2)}" width="${(cellSize + 0.2).toFixed(2)}" height="${(cellSize + 0.2).toFixed(2)}" fill="#F8FAFC" />`;
      }
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background:#090B10; border-radius:12px; padding:8px; box-sizing:border-box;">
      ${rects}
    </svg>
  `;
}
