import {
  File,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { getFileCategory } from '../utils/formatters';

interface FileIconProps {
  mimeType: string | null;
  fileName: string;
}

export function FileIcon({ mimeType, fileName }: FileIconProps) {
  const category = getFileCategory(mimeType, fileName);

  return (
    <div className={`file-icon-box ${category}`} aria-hidden="true">
      {category === 'image' && <ImageIcon size={20} />}
      {category === 'pdf' && <FileText size={20} />}
      {category === 'doc' && <FileText size={20} />}
      {category === 'sheet' && <FileSpreadsheet size={20} />}
      {(category === 'text' || category === 'other') && <File size={20} />}
    </div>
  );
}
