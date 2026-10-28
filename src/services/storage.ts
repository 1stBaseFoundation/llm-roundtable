import fs from 'fs';
import path from 'path';
import { Transcript, Message } from '../types';

const HISTORY_DIR = path.join(__dirname, '../../data');
const HISTORY_FILE = path.join(HISTORY_DIR, 'history.json');

export interface SavedDebate {
  id: string;
  query: string;
  rounds: number;
  messages: Message[];
  finalArtifact: string;
  createdAt: string;
  completedAt: string;
}

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

// Load history from file
export function loadHistory(): SavedDebate[] {
  try {
    ensureDataDir();
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
}

// Save debate to history
export function saveDebate(transcript: Transcript): SavedDebate {
  try {
    ensureDataDir();
    const history = loadHistory();
    
    const savedDebate: SavedDebate = {
      id: transcript.id,
      query: transcript.query,
      rounds: transcript.rounds,
      messages: transcript.messages,
      finalArtifact: transcript.artifact || '',
      createdAt: transcript.createdAt.toISOString(),
      completedAt: new Date().toISOString(),
    };
    
    // Add to beginning of history (newest first)
    history.unshift(savedDebate);
    
    // Keep only last 100 debates
    const trimmedHistory = history.slice(0, 100);
    
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmedHistory, null, 2));
    
    return savedDebate;
  } catch (error) {
    console.error('Error saving debate:', error);
    throw error;
  }
}

// Get a single debate by ID
export function getDebateById(id: string): SavedDebate | null {
  const history = loadHistory();
  return history.find((debate) => debate.id === id) || null;
}

// Delete a debate from history
export function deleteDebate(id: string): boolean {
  try {
    const history = loadHistory();
    const filtered = history.filter((debate) => debate.id !== id);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(filtered, null, 2));
    return true;
  } catch (error) {
    console.error('Error deleting debate:', error);
    return false;
  }
}

// Clear all history
export function clearHistory(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(HISTORY_FILE, '[]');
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}