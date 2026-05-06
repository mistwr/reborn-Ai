"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Facebook,
  Users,
  Calendar,
  Clock,
  Send,
  Image as ImageIcon,
  Video,
  Link2,
  Plus,
  Trash2,
  Settings,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Edit3,
  Copy,
  Sparkles,
  Target,
  TrendingUp,
  BarChart3,
  Zap,
} from "lucide-react"

interface ScheduledPost {
  id: string
  content: string
  mediaUrl?: string
  mediaType?: "image" | "video" | "link"
  groups: string[]
  scheduledTime: Date
  status: "pending" | "posted" | "failed"
  createdAt: Date
}

interface FacebookGroup {
  id: string
  name: string
  memberCount?: number
  selected: boolean
}

export function FacebookAutoPost() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [groups, setGroups] = useState<FacebookGroup[]>([])
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [postContent, setPostContent] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [autoPostEnabled, setAutoPostEnabled] = useState(false)
  const [postInterval, setPostInterval] = useState(60) // minutes

  // Simulate Facebook OAuth connection
  const connectFacebook = async () => {
    setIsConnecting(true)
    
    // In production, this would redirect to Facebook OAuth
    // For demo, we simulate the flow
    const clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "YOUR_FB_APP_ID"
    const redirectUri = encodeURIComponent(window.location.origin + "/api/auth/facebook/callback")
    const scope = "public_profile,email,groups_access_member_info,publish_to_groups"
    
    // Open Facebook OAuth in popup
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`
    
    // For demo purposes, simulate connection after 2 seconds
    setTimeout(() => {
      setIsConnected(true)
      setIsConnecting(false)
      // Load mock groups
      setGroups([
        { id: "1", name: "Marketing Digital Portugal", memberCount: 15420, selected: false },
        { id: "2", name: "Empreendedores PT", memberCount: 8932, selected: false },
        { id: "3", name: "Negocios Online", memberCount: 23105, selected: false },
        { id: "4", name: "Startups Portugal", memberCount: 5621, selected: false },
        { id: "5", name: "Freelancers PT", memberCount: 12890, selected: false },
      ])
    }, 2000)
  }

  const disconnectFacebook = () => {
    setIsConnected(false)
    setGroups([])
    setScheduledPosts([])
  }

  const toggleGroupSelection = (groupId: string) => {
    setGroups(groups.map(g => 
      g.id === groupId ? { ...g, selected: !g.selected } : g
    ))
  }

  const selectAllGroups = () => {
    const allSelected = groups.every(g => g.selected)
    setGroups(groups.map(g => ({ ...g, selected: !allSelected })))
  }

  const generateAIContent = async () => {
    setIsGeneratingAI(true)
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: "Gera um post envolvente para Facebook sobre marketing digital ou empreendedorismo. Deve ser curto (max 280 caracteres), ter emojis relevantes, e incluir um call-to-action. Responde APENAS com o texto do post, sem explicacoes."
          }]
        })
      })

      if (response.ok) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let result = ""

        while (reader) {
          const { done, value } = await reader.read()
          if (done) break
          result += decoder.decode(value, { stream: true })
        }

        setPostContent(result.trim())
      }
    } catch (error) {
      console.error("Error generating AI content:", error)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const schedulePost = () => {
    if (!postContent.trim() || groups.filter(g => g.selected).length === 0) {
      return
    }

    const scheduledTime = scheduleDate && scheduleTime 
      ? new Date(`${scheduleDate}T${scheduleTime}`)
      : new Date()

    const newPost: ScheduledPost = {
      id: Date.now().toString(),
      content: postContent,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaUrl ? (mediaUrl.includes("video") ? "video" : "image") : undefined,
      groups: groups.filter(g => g.selected).map(g => g.name),
      scheduledTime,
      status: "pending",
      createdAt: new Date()
    }

    setScheduledPosts([...scheduledPosts, newPost])
    setPostContent("")
    setMediaUrl("")
    setScheduleDate("")
    setScheduleTime("")
    setGroups(groups.map(g => ({ ...g, selected: false })))
  }

  const deleteScheduledPost = (postId: string) => {
    setScheduledPosts(scheduledPosts.filter(p => p.id !== postId))
  }

  const postNow = async (post: ScheduledPost) => {
    // In production, this would call the Facebook Graph API
    // POST /{group-id}/feed with the post content
    
    setScheduledPosts(scheduledPosts.map(p => 
      p.id === post.id ? { ...p, status: "posted" as const } : p
    ))
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
          <Facebook className="h-10 w-10 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Facebook Auto-Post</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Conecta a tua conta Facebook para agendar e publicar automaticamente em todos os teus grupos.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mb-8">
          <Card className="bg-muted/30 border-muted">
            <CardContent className="pt-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium">Publica em Grupos</p>
              <p className="text-xs text-muted-foreground">Todos os grupos de uma vez</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-muted">
            <CardContent className="pt-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">Agenda Posts</p>
              <p className="text-xs text-muted-foreground">Programa para qualquer hora</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-muted">
            <CardContent className="pt-4 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-sm font-medium">Conteudo com IA</p>
              <p className="text-xs text-muted-foreground">Gera posts automaticamente</p>
            </CardContent>
          </Card>
        </div>

        <Button
          size="lg"
          onClick={connectFacebook}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              A Conectar...
            </>
          ) : (
            <>
              <Facebook className="h-5 w-5" />
              Conectar Facebook
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground mt-4 max-w-sm">
          Ao conectar, autorizas o Reborn AI a publicar nos grupos onde es membro ou administrador.
        </p>
      </div>
    )
  }

  // Connected state
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Facebook className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Facebook Auto-Post</h2>
              <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-500 text-xs">
                Conectado
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{groups.length} grupos disponiveis</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={disconnectFacebook} className="text-xs">
          Desconectar
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="create" className="h-full flex flex-col">
          <div className="px-4 pt-3 shrink-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="create" className="text-xs">
                <Edit3 className="h-3 w-3 mr-1" />
                Criar Post
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Agendados ({scheduledPosts.filter(p => p.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Definicoes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Create Post Tab */}
          <TabsContent value="create" className="flex-1 overflow-auto p-4 mt-0">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Post Content */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Conteudo do Post</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAIContent}
                    disabled={isGeneratingAI}
                    className="gap-1 text-xs"
                  >
                    {isGeneratingAI ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Gerar com IA
                  </Button>
                </div>
                <Textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Escreve o teu post aqui ou gera com IA..."
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {postContent.length} caracteres
                </p>
              </div>

              {/* Media URL */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Imagem ou Video (URL)</Label>
                <div className="flex gap-2">
                  <Input
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Hora</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Groups Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Seleciona os Grupos</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllGroups}
                    className="text-xs"
                  >
                    {groups.every(g => g.selected) ? "Desselecionar Todos" : "Selecionar Todos"}
                  </Button>
                </div>
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      onClick={() => toggleGroupSelection(group.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        group.selected 
                          ? "border-blue-500 bg-blue-500/10" 
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          group.selected ? "border-blue-500 bg-blue-500" : "border-muted-foreground/30"
                        }`}>
                          {group.selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{group.name}</p>
                          {group.memberCount && (
                            <p className="text-xs text-muted-foreground">
                              {group.memberCount.toLocaleString()} membros
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Post Button */}
              <div className="flex gap-3">
                <Button
                  onClick={schedulePost}
                  disabled={!postContent.trim() || groups.filter(g => g.selected).length === 0}
                  className="flex-1 gap-2"
                >
                  {scheduleDate && scheduleTime ? (
                    <>
                      <Calendar className="h-4 w-4" />
                      Agendar Post
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Publicar Agora
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Scheduled Posts Tab */}
          <TabsContent value="scheduled" className="flex-1 overflow-auto p-4 mt-0">
            <div className="max-w-2xl mx-auto space-y-4">
              {scheduledPosts.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum post agendado</p>
                </div>
              ) : (
                scheduledPosts.map((post) => (
                  <Card key={post.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2 mb-2">{post.content}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {post.groups.map((group, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {group}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {post.scheduledTime.toLocaleString("pt-PT")}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={
                                post.status === "posted" 
                                  ? "bg-green-500/10 border-green-500/30 text-green-500" 
                                  : post.status === "failed"
                                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                                  : "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                              }
                            >
                              {post.status === "posted" ? "Publicado" : post.status === "failed" ? "Falhou" : "Pendente"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {post.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => postNow(post)}
                              className="h-8 w-8"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteScheduledPost(post.id)}
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 overflow-auto p-4 mt-0">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Auto-Post */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Auto-Post</CardTitle>
                      <CardDescription>Publica automaticamente em intervalos regulares</CardDescription>
                    </div>
                    <Switch
                      checked={autoPostEnabled}
                      onCheckedChange={setAutoPostEnabled}
                    />
                  </div>
                </CardHeader>
                {autoPostEnabled && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Intervalo entre posts (minutos)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[postInterval]}
                            onValueChange={([v]) => setPostInterval(v)}
                            min={15}
                            max={240}
                            step={15}
                            className="flex-1"
                          />
                          <span className="text-sm font-mono w-16 text-right">{postInterval} min</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        O Reborn AI vai gerar e publicar conteudo automaticamente a cada {postInterval} minutos.
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Estatisticas</CardTitle>
                  <CardDescription>Resumo da tua atividade</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-2xl font-bold text-blue-500">{scheduledPosts.length}</p>
                      <p className="text-xs text-muted-foreground">Posts Totais</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-2xl font-bold text-green-500">
                        {scheduledPosts.filter(p => p.status === "posted").length}
                      </p>
                      <p className="text-xs text-muted-foreground">Publicados</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-2xl font-bold text-yellow-500">
                        {scheduledPosts.filter(p => p.status === "pending").length}
                      </p>
                      <p className="text-xs text-muted-foreground">Pendentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* API Info */}
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Sobre a API do Facebook</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Para publicar em grupos automaticamente, e necessario uma app Facebook aprovada 
                        com permissoes de publish_to_groups. Cria a tua app em developers.facebook.com.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
