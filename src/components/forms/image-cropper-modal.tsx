'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Cropper from 'react-easy-crop'
import { Button } from '@/components/ui/button'

type ImageCropperModalProps = {
  open: boolean
  onClose: () => void
  imageURL: string
  requiredWidth: number
  requiredHeight: number
  onCropped: (blob: Blob, previewURL: string) => void
}

export default function ImageCropperModal({ open, onClose, imageURL, requiredWidth, requiredHeight, onCropped }: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1)
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const aspect = useMemo(() => requiredWidth / requiredHeight, [requiredWidth, requiredHeight])

  const onCropComplete = useCallback((_area: any, areaPixels: any) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  async function getCroppedImg(imageSrc: string, cropPixels: { x: number; y: number; width: number; height: number }) {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    const imgPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image)
      image.onerror = reject
    })
    image.src = imageSrc
    await imgPromise

    const canvas = document.createElement('canvas')
    canvas.width = requiredWidth
    canvas.height = requiredHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')

    // scale to required size
    const scaleX = requiredWidth / cropPixels.width
    const scaleY = requiredHeight / cropPixels.height
    ctx.drawImage(
      image,
      cropPixels.x,
      cropPixels.y,
      cropPixels.width,
      cropPixels.height,
      0,
      0,
      requiredWidth,
      requiredHeight
    )

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob as Blob), 'image/jpeg', 0.92)
    })
  }

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return
    const blob = await getCroppedImg(imageURL, croppedAreaPixels)
    const previewURL = URL.createObjectURL(blob)
    onCropped(blob, previewURL)
    onClose()
  }, [croppedAreaPixels, imageURL, onCropped, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Ritaglia immagine</h2>
            <p className="text-xs text-gray-500">Dimensione richiesta: {requiredWidth}x{requiredHeight}</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={onClose} aria-label="Chiudi">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="relative w-full h-[60vh] bg-gray-100 dark:bg-gray-800">
          <Cropper
            image={imageURL}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            restrictPosition
            showGrid
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleConfirm}>Conferma ritaglio</Button>
        </div>
      </div>
    </div>
  )
}


