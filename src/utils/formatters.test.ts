import { describe, expect, it } from 'vitest';
import {
  buildBreadcrumbs,
  collectDescendantIds,
  extractDisplayUsername,
  filterDriveItems,
  formatFileSize,
  getFileCategory,
  normalizeUsernameToEmail,
  sortDriveItems,
  validateItemName,
} from './formatters';
import type { DriveItem } from '../types';

const sampleItems: DriveItem[] = [
  {
    id: 'f1',
    name: 'Minutes',
    type: 'folder',
    parent_id: null,
    storage_path: null,
    file_url: null,
    mime_type: null,
    size_bytes: null,
    created_by: null,
    created_at: '2026-11-26T00:00:00Z',
    updated_at: '2026-11-26T00:00:00Z',
  },
  {
    id: 'f2',
    name: '2026',
    type: 'folder',
    parent_id: 'f1',
    storage_path: null,
    file_url: null,
    mime_type: null,
    size_bytes: null,
    created_by: null,
    created_at: '2026-11-26T00:00:00Z',
    updated_at: '2026-11-26T00:00:00Z',
  },
  {
    id: 'file1',
    name: 'november-meeting.pdf',
    type: 'file',
    parent_id: 'f2',
    storage_path: 'folders/f2/november-meeting.pdf',
    file_url: null,
    mime_type: 'application/pdf',
    size_bytes: 204800,
    created_by: null,
    created_at: '2026-11-26T00:00:00Z',
    updated_at: '2026-11-26T00:00:00Z',
  },
];

describe('formatters & helpers', () => {
  it('normalizes username to configured internal email domain', () => {
    expect(normalizeUsernameToEmail('Rahul')).toBe('rahul@digitalpaithini.local');
    expect(normalizeUsernameToEmail('member1@example.com')).toBe('member1@example.com');
    expect(extractDisplayUsername('rahul@digitalpaithini.local')).toBe('rahul');
  });

  it('validates folder and file names', () => {
    expect(validateItemName('  Sahithyotsav  ')).toBe('Sahithyotsav');
    expect(() => validateItemName('   ')).toThrow();
    expect(() => validateItemName('bad/name')).toThrow();
  });

  it('formats file sizes and detects file categories', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(getFileCategory('application/pdf', 'doc.pdf')).toBe('pdf');
    expect(getFileCategory(null, 'photo.JPG')).toBe('image');
    expect(getFileCategory(null, 'accounts.xlsx')).toBe('sheet');
    expect(getFileCategory(null, 'report.docx')).toBe('doc');
  });

  it('builds breadcrumbs, collects descendants, filters, and sorts', () => {
    expect(buildBreadcrumbs('f2', sampleItems).map((i) => i.name)).toEqual(['Minutes', '2026']);
    expect(collectDescendantIds('f1', sampleItems)).toEqual(['f1', 'f2', 'file1']);
    expect(filterDriveItems(sampleItems, 'november').map((i) => i.id)).toEqual(['file1']);
    expect(sortDriveItems([sampleItems[2], sampleItems[0]]).map((i) => i.type)).toEqual([
      'folder',
      'file',
    ]);
  });
});
