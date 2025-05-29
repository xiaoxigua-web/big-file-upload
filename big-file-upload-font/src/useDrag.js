import { useCallback, useEffect, useState } from "react"
import {message} from 'antd'
import { MAX_FILE_SIZE } from "./constant"

function useDrag(uploadContainerRef){
  //定义变量保存用户选中的文件
  const [selectedFile,setSelectedFile] = useState(null)

  const [filePreview,setFilePreview] = useState({url:null,type:null })

  const handleDrag = useCallback((event)=>{
    event.preventDefault()  //阻止默认行为
    event.stopPropagation()  //阻止事件传播
  },[])
  const checkFile = (files)=>{
    const file = files[0]
    if(!file){
      message.error('没有选择文件!')
      return
    }
    if(file.size > MAX_FILE_SIZE){
      message.error('不能超过2G!')
      return
    }
    if(!(file.type.startsWith('image/') || file.type.startsWith('video/'))){
      message.error('必须是图片或视频!')
      return
    }
    setSelectedFile(file)
  }

  const handleDrop = useCallback((event)=>{
    event.preventDefault()  //阻止默认行为
    event.stopPropagation()  //阻止事件传播
    const {files} = event.dataTransfer
    console.log(files)
    checkFile(files)
  },[])

  useEffect(()=>{
    if(!selectedFile){
      return
    }
    const url = URL.createObjectURL(selectedFile) //创建一个地址指向文件
    setFilePreview({url,type:selectedFile.type})
    return ()=>{
      URL.revokeObjectURL(url)
    }
  },[selectedFile])

  useEffect(()=>{
    const uploadContainer = uploadContainerRef.current
    uploadContainer.addEventListener('dragenter',handleDrag)
    uploadContainer.addEventListener('dragover',handleDrag)
    uploadContainer.addEventListener('drop',handleDrop)
    uploadContainer.addEventListener('dragleave',handleDrag)
    return()=>{
      uploadContainer.removeEventListener('dragenter',handleDrag)
      uploadContainer.removeEventListener('dragover',handleDrag)
      uploadContainer.removeEventListener('drop',handleDrop)
      uploadContainer.removeEventListener('dragleave',handleDrag)
    }
  },[])

  const resetFile = ()=>{
    setSelectedFile(null)
    setFilePreview({url:null,type:null })
  }

  return  {
    selectedFile,
    filePreview,
    resetFile
  }
}

export default useDrag