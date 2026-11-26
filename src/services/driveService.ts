import { isSupabaseConfigured } from '../lib/supabase';
import { localPreviewDriveService } from './localPreviewService';
import { supabaseDriveService } from './supabaseDriveService';
import type { DriveService } from '../types';

export const driveService: DriveService = isSupabaseConfigured
  ? supabaseDriveService
  : localPreviewDriveService;
