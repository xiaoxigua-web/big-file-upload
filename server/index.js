const express = require('express')
const logger = require('morgan')
const { StatusCodes } = require('http-status-codes')
const cors = require('cors')
const fs = require('fs-extra')
const path = require('path')
const CHUNK_SIZE = 1024 * 1024 * 100
const PUBLIC_DIR = path.resolve(__dirname, 'public')
const TEMP_DIR = path.resolve(__dirname, 'temp')

//存放上传合并好的文件
fs.ensureDirSync(PUBLIC_DIR)
//存放分片文件
fs.ensureDirSync(TEMP_DIR)

const app = express()
app.use(logger('dev'))
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.resolve(__dirname, 'public')))



app.post('/upload/:fileName', async (req, res, next) => {
  const { fileName } = req.params
  const { chunkFileName } = req.query
  console.log(fileName, chunkFileName)
  //创建保存分片的目录
  const chunkDir = path.resolve(TEMP_DIR, fileName)
  //分片的文件路径
  const chunkFilePath = path.resolve(chunkDir, chunkFileName)
  await fs.ensureDir(chunkDir)
  const ws = fs.createWriteStream(chunkFilePath, {})
  //暂停上传
  req.on('aborted', () => { ws.close() })
  try {
    await pipeStream(req, ws)
    res.json({
      success: true
    })
  } catch (error) {
    next(error)
  }

})
app.get('/merge/:fileName', async (req, res, next) => {
  const { fileName } = req.params
  console.log('merge',fileName)
  try {
    await mergeChunks(fileName)

    res.json({
      success: true
    })

  } catch (error) {

  }
})

async function mergeChunks(fileName) {
  const mergedFilePath = path.resolve(PUBLIC_DIR, fileName)
  const chunkDir = path.resolve(TEMP_DIR, fileName)
  const chunkFiles = await fs.readdir(chunkDir)
  try {
    chunkFiles.sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))
    console.log('chunkfiles',chunkFiles)
    const pipes = chunkFiles.map((chunkFile, index) => {
      return pipeStream(
        fs.createReadStream(path.resolve(chunkDir, chunkFile), { autoClose: true }),
        fs.createWriteStream(mergedFilePath, { start: index * CHUNK_SIZE })
      )
    }) 
    await Promise.all(pipes)
    console.log('合并完成!!')
    await fs.rmdir(chunkDir, { recursive: true })

  } catch (error) {
    console.log(error)
    next(error)

  }

}

function pipeStream(rs, ws) {
  return new Promise((resolve, reject) => {
    rs.pipe(ws).on('finish', resolve).on('error', reject)
  })
}

app.listen(8080, () => {
  console.log('server started on part 8080')
})
