import {
  DropdownMenu as KDropdownMenu,
  type DropdownMenuContentProps as KDropdownMenuContentProps,
  type DropdownMenuItemProps as KDropdownMenuItemProps,
  type DropdownMenuRootProps,
  type DropdownMenuSeparatorProps as KDropdownMenuSeparatorProps,
} from '@kobalte/core/dropdown-menu';
import type { PolymorphicProps } from '@kobalte/core/polymorphic';
import { cn } from '@lib/utils';
import {
  type Component,
  type JSX,
  type ParentComponent,
  splitProps,
  type ValidComponent,
} from 'solid-js';

const DropdownMenu: Component<DropdownMenuRootProps> = (props) => (
  <KDropdownMenu gutter={4} {...props} />
);

const DropdownMenuTrigger = KDropdownMenu.Trigger;

type DropdownMenuContentProps<T extends ValidComponent = 'div'> =
  KDropdownMenuContentProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const DropdownMenuContent = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DropdownMenuContentProps<T>>
) => {
  const [local, rest] = splitProps(props as DropdownMenuContentProps, [
    'class',
    'children',
  ]);
  return (
    <KDropdownMenu.Portal>
      <KDropdownMenu.Content
        class={cn(
          'bg-popover text-popover-foreground z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-md outline-none',
          'data-[expanded]:animate-in data-[expanded]:fade-in-0 data-[expanded]:zoom-in-95',
          'data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95',
          local.class
        )}
        {...rest}
      >
        {local.children}
      </KDropdownMenu.Content>
    </KDropdownMenu.Portal>
  );
};

type DropdownMenuItemProps<T extends ValidComponent = 'div'> =
  KDropdownMenuItemProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const DropdownMenuItem = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, DropdownMenuItemProps<T>>
) => {
  const [local, rest] = splitProps(props as DropdownMenuItemProps, [
    'class',
    'children',
  ]);
  return (
    <KDropdownMenu.Item
      class={cn(
        'focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none transition-colors',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        local.class
      )}
      {...rest}
    >
      {local.children}
    </KDropdownMenu.Item>
  );
};

interface DropdownMenuLabelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
}

const DropdownMenuLabel: ParentComponent<DropdownMenuLabelProps> = (props) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div class={cn('px-3 py-2 text-sm font-medium', local.class)} {...rest}>
      {local.children}
    </div>
  );
};

type DropdownMenuSeparatorProps<T extends ValidComponent = 'hr'> =
  KDropdownMenuSeparatorProps<T> & {
    class?: string | undefined;
  };

const DropdownMenuSeparator = <T extends ValidComponent = 'hr'>(
  props: PolymorphicProps<T, DropdownMenuSeparatorProps<T>>
) => {
  const [local, rest] = splitProps(props as DropdownMenuSeparatorProps, [
    'class',
  ]);
  return (
    <KDropdownMenu.Separator
      class={cn('bg-border -mx-1 my-1 h-px', local.class)}
      {...rest}
    />
  );
};

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
