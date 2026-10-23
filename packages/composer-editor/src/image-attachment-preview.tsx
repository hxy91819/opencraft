import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@opencraft/design-system-web/action-icons";
import { ZoomableImage } from "@opencraft/chat-render-web/zoomable-image";
import { useIntl } from "@opencraft/i18n/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

export interface ComposerPreviewImage {
  readonly id: string;
  readonly name: string;
  readonly source: string;
}

/** A transient view of the existing draft's resources; it never owns uploads. */
export function ImageAttachmentPreview({ images, selectedId, onSelect, onClose, onReturnFocus, portalContainer }: {
  readonly images: readonly ComposerPreviewImage[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
  readonly onClose: () => void;
  readonly onReturnFocus: () => void;
  readonly portalContainer?: HTMLElement | null;
}) {
  const intl = useIntl();
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const index = images.findIndex(image => image.id === selectedId);
  const image = images[index];
  if (image === undefined) return null;
  const label = intl.formatMessage({ id: "chat.image.position", defaultMessage: "Attached image {index} of {count}" }, { index: index + 1, count: images.length });
  const previous = () => onSelect(images[(index + images.length - 1) % images.length]!.id);
  const next = () => onSelect(images[(index + 1) % images.length]!.id);
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal container={portalContainer ?? undefined}>
      <Dialog.Overlay className="modal-surface__scrim" data-layer="nested" />
      <Dialog.Content
        aria-describedby={undefined}
        className="modal-surface opencraft-composer-image-preview"
        data-layer="nested"
        data-presentation="fullscreen"
        data-size="workspace"
        onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus(); }}
        onEscapeKeyDown={event => { if (event.isComposing || event.keyCode === 229) event.preventDefault(); }}
        onKeyDown={event => {
          if (event.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229 || images.length < 2) return;
          if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
          if (event.key === "ArrowRight") { event.preventDefault(); next(); }
        }}
      >
        <Dialog.Title className="modal-surface__accessible-title">{label}</Dialog.Title>
        {failedSource === image.source
          ? <div className="thread-user-image-lightbox__unavailable" role="status">{intl.formatMessage({ id: "chat.image.unavailable", defaultMessage: "Image unavailable" })}</div>
          : <ZoomableImage alt={image.name} src={image.source} fitToContainer onBackgroundClick={onClose} onError={() => setFailedSource(image.source)} />}
        {images.length > 1 && <div className="thread-user-image-lightbox__navigation">
          <button aria-label={intl.formatMessage({ id: "chat.image.previous", defaultMessage: "Previous image" })} onClick={previous} type="button"><ChevronLeftIcon aria-hidden size={20} /></button>
          <span aria-live="polite">{index + 1} / {images.length}</span>
          <button aria-label={intl.formatMessage({ id: "chat.image.next", defaultMessage: "Next image" })} onClick={next} type="button"><ChevronRightIcon aria-hidden size={20} /></button>
        </div>}
        <Dialog.Close aria-label={intl.formatMessage({ id: "chat.image.close", defaultMessage: "Close image preview" })} className="modal-surface__close" type="button"><CloseIcon aria-hidden size={20} /></Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
