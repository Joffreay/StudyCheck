"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  sankey,
  sankeyJustify,
  sankeyLinkHorizontal,
} from "d3-sankey";
import type { PrismaScrFlow } from "@/lib/export/prisma-scr-types";
import {
  buildPrismaScrSankeyGraph,
  getSankeyNodeColor,
  type SankeyNodeDef,
} from "@/lib/export/prisma-scr-sankey";

type LinkInput = { source: string; target: string; value: number };

type LayoutNode = SankeyNodeDef & {
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  value?: number;
};

type LayoutLink = LinkInput & {
  width?: number;
  source: LayoutNode;
  target: LayoutNode;
};

const STAGE_LABELS = [
  { x: 0.08, label: "Sources" },
  { x: 0.28, label: "Identification" },
  { x: 0.48, label: "Déduplication" },
  { x: 0.68, label: "Screening" },
  { x: 0.9, label: "Éligibilité" },
];

function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function PrismaScrSankeyChart({ flow }: { flow: PrismaScrFlow }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(360, Math.floor(entry.contentRect.width)));
    });

    observer.observe(element);
    setWidth(Math.max(360, Math.floor(element.clientWidth)));
    return () => observer.disconnect();
  }, []);

  const graph = useMemo(() => buildPrismaScrSankeyGraph(flow), [flow]);

  const layout = useMemo(() => {
    const height = Math.max(360, graph.nodes.length * 18);
    const margin = { top: 36, right: 160, bottom: 16, left: 160 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const generator = sankey<SankeyNodeDef, LinkInput>()
      .nodeId((node) => node.id)
      .nodeWidth(16)
      .nodePadding(14)
      .nodeAlign(sankeyJustify)
      .extent([
        [0, 0],
        [innerWidth, innerHeight],
      ]);

    const nodes = graph.nodes.map((node) => ({ ...node }));
    const links = graph.links.map((link) => ({ ...link }));

    const layoutGraph = generator({ nodes, links });
    return {
      nodes: layoutGraph.nodes as LayoutNode[],
      links: layoutGraph.links as LayoutLink[],
      height,
      margin,
      innerWidth,
    };
  }, [graph, width]);

  if (flow.identification.totalRecordsIdentified === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Importez des références pour visualiser le flux PRISMA-ScR.
      </p>
    );
  }

  if (graph.links.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Données insuffisantes pour construire le diagramme.
      </p>
    );
  }

  const linkPath = sankeyLinkHorizontal<SankeyNodeDef, LinkInput>();

  return (
    <div ref={containerRef} className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3">
      <svg
        width={width}
        height={layout.height}
        viewBox={`0 0 ${width} ${layout.height}`}
        role="img"
        aria-label="Diagramme de Sankey du flux PRISMA-ScR"
        className="max-w-full"
      >
        <g transform={`translate(${layout.margin.left},${layout.margin.top})`}>
          {STAGE_LABELS.map((stage) => (
            <text
              key={stage.label}
              x={stage.x * layout.innerWidth}
              y={-12}
              textAnchor="middle"
              className="fill-slate-500 text-[10px] font-semibold uppercase tracking-[0.14em]"
            >
              {stage.label}
            </text>
          ))}

          {layout.links.map((link) => {
            const path = linkPath(link);
            if (!path) return null;

            return (
              <path
                key={`${link.source.id}-${link.target.id}-${link.value}`}
                d={path}
                fill="none"
                stroke={getSankeyNodeColor(link.source)}
                strokeOpacity={0.28}
                strokeWidth={Math.max(1, link.width ?? 1)}
              />
            );
          })}

          {layout.nodes.map((node) => {
            const nodeHeight = Math.max(1, (node.y1 ?? 0) - (node.y0 ?? 0));
            const nodeWidth = Math.max(1, (node.x1 ?? 0) - (node.x0 ?? 0));
            const isLeft = (node.x0 ?? 0) < layout.innerWidth / 2;
            const labelX = isLeft ? (node.x0 ?? 0) - 8 : (node.x1 ?? 0) + 8;
            const labelAnchor = isLeft ? "end" : "start";
            const count =
              node.value ??
              layout.links
                .filter((link) => link.target.id === node.id)
                .reduce((sum, link) => sum + link.value, 0);

            return (
              <g key={node.id}>
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx={3}
                  fill={getSankeyNodeColor(node)}
                  opacity={0.92}
                />
                <text
                  x={labelX}
                  y={((node.y0 ?? 0) + (node.y1 ?? 0)) / 2}
                  dy="0.35em"
                  textAnchor={labelAnchor}
                  className="fill-slate-700 text-[11px]"
                >
                  {node.label}
                </text>
                <text
                  x={labelX}
                  y={((node.y0 ?? 0) + (node.y1 ?? 0)) / 2 + 13}
                  dy="0.35em"
                  textAnchor={labelAnchor}
                  className="fill-slate-500 text-[10px] font-medium tabular-nums"
                >
                  {formatCount(Math.round(count))}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
