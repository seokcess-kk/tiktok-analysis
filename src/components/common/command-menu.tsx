'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  FileText,
  Image,
  Lightbulb,
  Search,
  Settings,
  Target,
  Users,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useCommandK } from '@/hooks/use-keyboard-shortcut';

interface SearchResult {
  id: string;
  type: 'account' | 'campaign' | 'creative' | 'insight' | 'strategy' | 'report';
  title: string;
  description?: string;
  href: string;
}

interface CommandMenuProps {
  accountId?: string;
}

export function CommandMenu({ accountId }: CommandMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  useCommandK(() => setOpen(true));

  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}${accountId ? `&accountId=${accountId}` : ''}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setResults(data.data.results);
          }
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, accountId]);

  const handleSelect = React.useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      router.push(href);
    },
    [router]
  );

  const quickLinks = accountId
    ? [
        {
          icon: BarChart3,
          label: '대시보드',
          href: `/accounts/${accountId}`,
          shortcut: 'D',
        },
        {
          icon: Image,
          label: '크리에이티브',
          href: `/accounts/${accountId}/creatives`,
          shortcut: 'R',
        },
        {
          icon: Lightbulb,
          label: '인사이트',
          href: `/accounts/${accountId}/insights`,
          shortcut: 'I',
        },
        {
          icon: Target,
          label: '전략',
          href: `/accounts/${accountId}/strategies`,
          shortcut: 'T',
        },
        {
          icon: FileText,
          label: '리포트',
          href: `/accounts/${accountId}/reports`,
          shortcut: 'P',
        },
        {
          icon: Settings,
          label: '설정',
          href: '/settings',
          shortcut: 'S',
        },
      ]
    : [
        {
          icon: Building2,
          label: '계정 목록',
          href: '/accounts',
          shortcut: 'A',
        },
        {
          icon: Settings,
          label: '설정',
          href: '/settings',
          shortcut: 'S',
        },
      ];

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'account':
        return Building2;
      case 'campaign':
        return Target;
      case 'creative':
        return Image;
      case 'insight':
        return Lightbulb;
      case 'strategy':
        return Target;
      case 'report':
        return FileText;
      default:
        return Search;
    }
  };

  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'account':
        return '계정';
      case 'campaign':
        return '캠페인';
      case 'creative':
        return '크리에이티브';
      case 'insight':
        return '인사이트';
      case 'strategy':
        return '전략';
      case 'report':
        return '리포트';
      default:
        return type;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-md hover:bg-accent transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>검색...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="검색어를 입력하세요..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? '검색 중...' : '검색 결과가 없습니다.'}
          </CommandEmpty>

          {results.length > 0 && (
            <CommandGroup heading="검색 결과">
              {results.map((result) => {
                const Icon = getResultIcon(result.type);
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={result.title}
                    onSelect={() => handleSelect(result.href)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.description && (
                        <span className="text-xs text-muted-foreground">
                          {result.description}
                        </span>
                      )}
                    </div>
                    <CommandShortcut>
                      {getResultTypeLabel(result.type)}
                    </CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {!query && (
            <>
              <CommandSeparator />
              <CommandGroup heading="빠른 이동">
                {quickLinks.map((link) => (
                  <CommandItem
                    key={link.href}
                    value={link.label}
                    onSelect={() => handleSelect(link.href)}
                  >
                    <link.icon className="mr-2 h-4 w-4" />
                    <span>{link.label}</span>
                    <CommandShortcut>{link.shortcut}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
