import {
  Toolbar,
  ToolbarToggleButton,
  Tooltip,
} from "@fluentui/react-components";
import {
  TextBoldRegular,
  TextItalicRegular,
} from "@fluentui/react-icons";

export interface FormattingToolbarProps {
  bold: boolean;
  italic: boolean;
  className?: string;
  onBoldChange: (checked: boolean) => void;
  onItalicChange: (checked: boolean) => void;
}

export function FormattingToolbar({
  bold,
  italic,
  className,
  onBoldChange,
  onItalicChange,
}: FormattingToolbarProps) {
  return (
    <Toolbar aria-label="Text formatting" className={className}>
      <Tooltip content="Bold" relationship="inaccessible">
        <ToolbarToggleButton
          appearance="subtle"
          checked={bold}
          icon={<TextBoldRegular />}
          aria-label="Bold"
          onClick={() => onBoldChange(!bold)}
        />
      </Tooltip>
      <Tooltip content="Italic" relationship="inaccessible">
        <ToolbarToggleButton
          appearance="subtle"
          checked={italic}
          icon={<TextItalicRegular />}
          aria-label="Italic"
          onClick={() => onItalicChange(!italic)}
        />
      </Tooltip>
    </Toolbar>
  );
}
