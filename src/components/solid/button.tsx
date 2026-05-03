import { type JSX, type ParentComponent, splitProps } from 'solid-js';
import { tv, type VariantProps } from 'tailwind-variants';

const buttonVariants = tv({
  base: [
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    'transition-all outline-none focus-visible:ring-3',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  variants: {
    variant: {
      default:
        'bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-outline/50',
      primary:
        'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/50',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/50',
      outline:
        'dark:border-input focus-visible:ring-outline/50 bg-background dark:bg-input/30 focus-visible:border-outline hover:bg-muted dark:hover:bg-input/50 hover:text-foreground border shadow-xs',
      ghost:
        'hover:bg-muted hover:text-foreground focus-visible:ring-outline/50',
      info: 'bg-info text-info-foreground hover:bg-info/90 focus-visible:ring-info/50',
      success:
        'bg-success text-success-foreground hover:bg-success/90 focus-visible:ring-success/50',
      warning:
        'bg-warning text-warning-foreground hover:bg-warning/90 focus-visible:ring-warning/50',
      error:
        'bg-error text-error-foreground hover:bg-error/90 focus-visible:ring-error/50',
    },
    size: {
      sm: 'h-9 px-3 py-2 text-sm',
      md: 'h-11 px-4 py-2 text-base',
      lg: 'h-12 px-8 py-2 text-lg',
      icon: 'size-11',
      'icon-sm': 'size-9',
      'icon-lg': 'size-12',
    },
  },
  defaultVariants: { variant: 'default', size: 'md' },
});

type ButtonVariants = VariantProps<typeof buttonVariants>;

interface ButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {
  class?: string;
}

const Button: ParentComponent<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'variant',
    'size',
    'class',
    'children',
  ]);
  return (
    <button
      class={buttonVariants({
        variant: local.variant,
        size: local.size,
        class: local.class,
      })}
      data-slot="button"
      {...rest}
    >
      {local.children}
    </button>
  );
};

export { Button, buttonVariants };
