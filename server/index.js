const express = require('express')
const logger = require('morgan')
const {StatusCodes} = require('http-status-codes')
const cors = require('cors')
const fs = require('fs-extra')
const path = require('path')

//存放上传合并好的文件
fs.ensureDirSync(path.resolve(__dirname,'public'))
//存放分片文件
fs.ensureDirSync(path.resolve(__dirname,'temp'))

const app = express()
app.use(logger('dev'))
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.resolve(__dirname,'public')))

app.post('/upload/:fileName',async(req,res,next)=>{
  const {fileName} = req.params
  const {chunkFileName} = req.query
  console.log(fileName)
  res.json({
    success:true
  })

})
app.get('/merge/:fileName',async(req,res,next)=>{
  const {fileName} = req.params
  console.log(fileName)

  res.json({
    success:true
  })

})

app.listen(8080,()=>{
  console.log('server started on part 8080')
})