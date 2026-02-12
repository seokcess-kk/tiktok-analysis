'use client';

import { DrilldownNav, DrilldownLevel } from './drilldown-nav';
import { DataScopeIndicator } from './data-scope-indicator';

interface PageHeaderProps {
  title: string;
  description?: string;
  levels?: DrilldownLevel[];
  scope?: 'account' | 'campaign' | 'adgroup' | 'ad';
  scopeName?: string;
  dateRange?: { from: string; to: string };
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  levels = [],
  scope,
  scopeName,
  dateRange,
  actions,
}: PageHeaderProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* 브레드크럼 */}
      {levels.length > 0 && <DrilldownNav levels={levels} />}

      {/* 제목 + 액션 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* 데이터 범위 표시 */}
      {scope && scopeName && (
        <DataScopeIndicator
          scope={scope}
          scopeName={scopeName}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}
