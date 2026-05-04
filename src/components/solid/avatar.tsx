import {
  type Component,
  createSignal,
  type JSX,
  type ParentComponent,
  Show,
  splitProps,
} from 'solid-js';
import { tv, type VariantProps } from 'tailwind-variants';

const avatarVariants = tv({
  base: 'text-foreground bg-muted relative overflow-hidden rounded-full border-2 inline-flex',
  variants: {
    variant: {
      default: 'border-border',
      primary: 'border-primary',
      secondary: 'border-secondary',
      info: 'border-info',
      success: 'border-success',
      warning: 'border-warning',
      error: 'border-error',
    },
    size: {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
    },
  },
  defaultVariants: { variant: 'default', size: 'md' },
});

interface AvatarProps
  extends
    JSX.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  class?: string;
}

const Avatar: ParentComponent<AvatarProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'variant',
    'size',
    'class',
    'children',
  ]);
  return (
    <span
      class={avatarVariants({
        variant: local.variant,
        size: local.size,
        class: local.class,
      })}
      data-slot="avatar"
      {...rest}
    >
      {local.children}
    </span>
  );
};

interface AvatarImageProps extends JSX.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  class?: string;
}

const AvatarImage: Component<AvatarImageProps> = (props) => {
  const [errored, setErrored] = createSignal(false);
  const [local, rest] = splitProps(props, ['class']);
  return (
    <Show when={!errored()}>
      <img
        class={`relative z-1 h-full w-full object-cover ${local.class ?? ''}`}
        width={64}
        height={64}
        referrerpolicy="no-referrer"
        onError={() => setErrored(true)}
        data-slot="avatar-image"
        {...rest}
      />
    </Show>
  );
};

interface AvatarFallbackProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  class?: string;
}

const AvatarFallback: ParentComponent<AvatarFallbackProps> = (props) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <span
      class={`absolute inset-0.5 flex items-center justify-center rounded-full font-medium ${local.class ?? ''}`}
      data-slot="avatar-fallback"
      {...rest}
    >
      {local.children}
    </span>
  );
};

export { Avatar, AvatarFallback, AvatarImage };
