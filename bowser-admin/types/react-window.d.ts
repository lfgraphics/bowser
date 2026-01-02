declare module 'react-window' {
  import { Component, CSSProperties, ReactNode, Ref, Context } from 'react';

  export type ScrollDirection = 'backward' | 'forward';

  export interface ListChildComponentProps {
    data: any;
    index: number;
    isScrolling?: boolean;
    style: CSSProperties;
  }

  export type ListProps = {
    children: (props: ListChildComponentProps) => ReactNode;
    className?: string;
    direction?: 'vertical' | 'horizontal';
    height: number | string;
    initialScrollOffset?: number;
    itemCount: number;
    itemData?: any;
    itemKey?: (index: number, data: any) => any;
    itemSize: number | ((index: number) => number);
    layout?: 'vertical' | 'horizontal';
    onItemsRendered?: (props: {
        overscanStartIndex: number;
        overscanStopIndex: number;
        visibleStartIndex: number;
        visibleStopIndex: number;
    }) => void;
    onScroll?: (props: {
        scrollDirection: ScrollDirection;
        scrollOffset: number;
        scrollUpdateWasRequested: boolean;
    }) => void;
    overscanCount?: number;
    style?: CSSProperties;
    useIsScrolling?: boolean;
    width: number | string;
  };

  export class FixedSizeList extends Component<ListProps> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start'): void;
  }

  export class VariableSizeList extends Component<ListProps> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start'): void;
    resetAfterIndex(index: number, shouldForceUpdate?: boolean): void;
  }
}
