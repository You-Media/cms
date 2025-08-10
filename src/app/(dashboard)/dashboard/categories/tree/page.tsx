'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchCategoryTree } from '@/hooks/use-categories'
import type { CategoryTreeNode, CategoryTreeEdge } from '@/types/categories'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface TreeNode extends CategoryTreeNode {
  children: TreeNode[]
}

function buildTree(nodes: CategoryTreeNode[], edges: CategoryTreeEdge[]): TreeNode[] {
  const nodeMap = new Map<number, TreeNode>()
  nodes.forEach((n) => nodeMap.set(n.id, { ...n, children: [] }))

  const hasParent = new Set<number>()
  edges.forEach((e) => {
    const parent = nodeMap.get(e.source)
    const child = nodeMap.get(e.target)
    if (parent && child) {
      parent.children.push(child)
      hasParent.add(child.id)
    }
  })

  const roots: TreeNode[] = []
  nodeMap.forEach((n) => {
    if (!hasParent.has(n.id)) {
      roots.push(n)
    }
  })

  // Ordina per titolo per stabilità
  const sortTree = (list: TreeNode[]) => {
    list.sort((a, b) => a.title.localeCompare(b.title))
    list.forEach((n) => sortTree(n.children))
  }
  sortTree(roots)
  return roots
}

function TreeView({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="space-y-1">
      {nodes.map((n) => (
        <li key={n.id}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{n.title}</span>
            <span className="text-xs text-gray-500">(ID: {n.id})</span>
            <span className="text-xs text-gray-400">{n.slug}</span>
          </div>
          {n.children.length > 0 && (
            <div className="pl-4 border-l border-gray-200 dark:border-gray-700 mt-1">
              <TreeView nodes={n.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function CategoriesTreePage() {
  const [nodes, setNodes] = useState<CategoryTreeNode[]>([])
  const [edges, setEdges] = useState<CategoryTreeEdge[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    void loadTree()
  }, [])

  async function loadTree() {
    setIsLoading(true)
    try {
      const res = await fetchCategoryTree()
      setNodes(res.data.nodes)
      setEdges(res.data.edges)
    } catch {
      toast.error('Errore durante il caricamento dell\'albero categorie')
    } finally {
      setIsLoading(false)
    }
  }

  const tree = useMemo(() => buildTree(nodes, edges), [nodes, edges])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Albero delle Categorie</h1>
          <p className="text-sm text-gray-500">Visualizzazione gerarchica delle categorie</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.history.back()}>Torna indietro</Button>
          <Button onClick={() => void loadTree()}>Ricarica</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">Caricamento...</div>
      ) : tree.length === 0 ? (
        <div className="text-sm text-gray-500">Nessun dato disponibile</div>
      ) : (
        <div className="rounded border border-gray-200 dark:border-gray-700 p-4">
          <TreeView nodes={tree} />
        </div>
      )}
    </div>
  )
}



