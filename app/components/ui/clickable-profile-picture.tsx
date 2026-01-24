import { ImageModal, useImageModal } from '~/components/ui/image-modal';

interface ClickableProfilePictureProps {
  src: string;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  username?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12', 
  lg: 'w-16 h-16',
  xl: 'w-20 h-20'
};

export function ClickableProfilePicture({ 
  src, 
  alt, 
  className = '', 
  size = 'md',
  username 
}: ClickableProfilePictureProps) {
  const { isOpen, imageSrc, imageAlt, imageCaption, openModal, closeModal } = useImageModal();

  const handleClick = () => {
    const caption = username ? `${username}'s profile picture` : undefined;
    openModal(src, alt, caption);
  };

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity border-default bg-surface ${className}`}
        onClick={handleClick}
      />
      
      <ImageModal
        src={imageSrc}
        alt={imageAlt}
        isOpen={isOpen}
        onClose={closeModal}
        caption={imageCaption}
        showDownload={false}
      />
    </>
  );
}