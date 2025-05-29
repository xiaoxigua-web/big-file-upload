import { InboxOutlined } from "@ant-design/icons"
import './FileUpload.css'
import { useRef, useState } from "react"
import useDrag from './useDrag'
import {Button,message,Progress} from 'antd'
import { CHUNK_SIZE } from './constant'
import axiosInstance from "./axios"
import axios from 'axios'

const UploadStatus = {
  NOT_STARTED:'NOT_STARTED',
  UPLOADING:'UPLOADING',
  PAUSED:'PAUSED'
}


function FileUpload(){
  const uploadContainerRef = useRef(null)
  const {
    selectedFile,
    filePreview,
    resetFile
  } = useDrag(uploadContainerRef)
  console.log(selectedFile)
  const resetFileStatus = ()=>{
    resetFile()
    setUploadProgress({})
    setUploadStatus(UploadStatus.NOT_STARTED)
  }
  let [uploadProgress,setUploadProgress] = useState({})
  const [uploadStatus,setUploadStatus] = useState(UploadStatus.NOT_STARTED)
  const [cancelTokens,setCancelTokens] = useState([])
  const handleUpload = async ()=>{
    if(!selectedFile){
      message.error('未选择文件')
      return
    }
    setUploadStatus(UploadStatus.UPLOADING)
    const fileName = await getFileName(selectedFile)
    uploadFile(selectedFile,fileName,setUploadProgress,resetFileStatus,setCancelTokens)
    console.log('filename',fileName)
  }
  const pauseUpload = ()=>{
    setUploadStatus(UploadStatus.PAUSED)
    cancelTokens.forEach(cancelToken=>{
       cancelToken.cancel('pause')
    })
  }

  const renderButton = ()=>{
    switch(uploadStatus){
      case UploadStatus.NOT_STARTED:
        return <Button onClick={handleUpload}>上传</Button>
      case UploadStatus.UPLOADING:
        return <Button onClick={pauseUpload}>暂停</Button>
    }
  }
  const renderTotalProgress = ()=>{
     const percents = Object.values(uploadProgress)
     const totalPercent = Math.round(percents.reduce((acc,curr)=>acc+curr,0)/percents.length)
     return (
      <div>
        <span>总进度:</span>
        <Progress percent={totalPercent} />
      </div>
     )
  }
  const renderProgress = ()=>{
    if(uploadStatus !== UploadStatus.NOT_STARTED){
      return Object.keys(uploadProgress).map((chunkName,index)=>{
        return (
          <div>
            <span>切片{index}</span>
            <Progress percent={uploadProgress[chunkName]} />
          </div>
        )
      })
    }  
  }

  return (
    <>
     <div className="upload-container" ref={uploadContainerRef}>
       {renderFilePreview(filePreview)}
     </div>
     {renderButton()}
     {renderTotalProgress()}
     {renderProgress()}
    </>
   
  )
}

//实现切片上传
async function uploadFile(file,fileName,setUploadProgress,resetFileStatus,setCancelTokens) {
  //先请求接口看看是否已经传过了
  const {needUpload,uploadedList} = await axiosInstance.get(`/verify/${fileName}`)
  if(!needUpload){
    message.success('文件已存在')
    return
  }
  //切片
  const chunks = createFileChunks(file,fileName)  
  const newCancelTokens = []
  console.log(chunks)
  const requests = chunks.map(({chunk,chunkFileName})=>{
    const cancelToken = axios.CancelToken.source()
    newCancelTokens.push(cancelToken)
    const existingChunk = uploadedList.find((uploadedChunk)=>{
      return uploadedChunk.chunkFileName === chunkFileName
    })
    if(existingChunk){ //如果存在 说明已经上传过一部分了 或者传完了
       const uploadedSize = existingChunk.size
       const remainingChunk = chunk.slice(uploadedSize)  //截取
       if(remainingChunk.size === 0){
         //说明传完了 已经
         return Promise.resolve()
       }else{
        return createRequest(fileName,chunkFileName,remainingChunk,setUploadProgress,cancelToken)
       }
    }
    return createRequest(fileName,chunkFileName,chunk,setUploadProgress,cancelToken)
  })
  setCancelTokens(newCancelTokens)
  try {
    //同时上传分片
    await Promise.all(requests)
    // 全部上传完成后 请求合并接口
    await axiosInstance.get(`/merge/${fileName}`)
    //清空预览和进度条
    resetFileStatus()
    message.success('文件上传成功')
    
  } catch (error) {
    if(axios.isCancel(error)){
      message.warning('暂停上传')
    }
    console.log(error)
    
  }
  
}

function createRequest(fileName,chunkFileName,chunk,setUploadProgress,cancelToken ){
  return axiosInstance.post(`/upload/${fileName}`,chunk,{
    headers:{
      'Content-Type': 'application/octet-stream'
    },
    params:{
      chunkFileName
    },
    onUploadProgress:(progressEvent)=>{
      const percentCompleted = Math.round(progressEvent.loaded * 100 / progressEvent.total) 
      setUploadProgress((prevProgress)=>({
        ...prevProgress,
        [chunkFileName]:percentCompleted
      })) 
    },
    cancelToken:cancelToken.token
  })
}

function createFileChunks(file,fileName){
   let chunks = []
   let count = Math.ceil(file.size / CHUNK_SIZE)
   for(let i = 0; i < count; i++){
     let chunk = file.slice(i*CHUNK_SIZE,(i+1)*CHUNK_SIZE)
     chunks.push({
      chunk,
      chunkFileName:`${fileName}-${i}`
     })
   }
   return chunks
}

//根据文件内容得到hash文件名
async function getFileName(file){
  //计算hash
  const fileHash = await calculateFileHash(file)
  //获取文件扩展名
  const fileExtension = file.name.split('.').pop()
  return `${fileHash}.${fileExtension}`
}

async function calculateFileHash(file) {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256',arrayBuffer)
  return bufferToHex(hashBuffer)
}

//把arraybuffer转成16进制字符串
function bufferToHex(buffer){
  return Array.from(new Uint8Array(buffer)).map(b=>b.toString(16).padStart(2,'0')).join('')
}

//显示文件预览信息
function renderFilePreview(filePreview){
   const {url,type} = filePreview
   console.log(filePreview,url)
   if(url){
    if(type.startsWith('video/')){
      return (<video controls style={{width:'50%',height:'200px'}} key={url} >
        <source src={url} alt='preview' controls type="video/mp4"></source>
      </video>
    )
    }
    if(type.startsWith('image/')){
      return <img src={url} alt='preview'/>
    }
   }else{
    return <InboxOutlined></InboxOutlined>
   }
}


export default FileUpload