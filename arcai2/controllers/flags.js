const CreepDesigner = require('../functions/creepDesigner')
const Utils = require('../utils')

var FlagsController = {
  run: function(rooms, jobs, flags, spawnQueue){
    var greenFlags = flags.where({color: COLOR_GREEN})
    var purpleFlags = flags.where({color: COLOR_PURPLE})
    var yellowFlags = flags.where({color: COLOR_YELLOW})
    var redFlags = flags.where({color: COLOR_RED})
    var blueFlags = flags.where({color: COLOR_BLUE})
    var brownFlags = flags.where({color: COLOR_BROWN})

    _.forEach(greenFlags, function(flagObject){
      var flag = Game.flags[flagObject.name]
      var lookup = _.filter(flag.pos.look(), function(item){
        return (item.type == 'constructionSite')
      })[0]

      if(!lookup){
        flag.remove()
        return
      }else{
        var site = lookup.constructionSite
      }

      var siteJob = Utils.jobForTarget(site, jobs)

      if(siteJob.collect != 'harvest'){
        siteJob.collect = 'harvest'

        var room = rooms.findOne({name: flag.room.name})
        var sources = Utils.inflate(room.sources)

        var source = flag.pos.findClosestByRange(sources)

        siteJob.source = source.id

        jobs.update(siteJob)
      }

      if(!Utils.findCreepForJob(siteJob)){
        var nearestRoom = Utils.myNearestRoom(flag.room.name, rooms)

        spawnQueue.add({
          creep: CreepDesigner.createCreep({
            base: CreepDesigner.baseDesign.slowWork,
            cap: CreepDesigner.caps.slowWork,
            room: Game.rooms[nearestRoom]
          }),
          memory: {
            jobHash: siteJob.hash
          },
          priority: siteJob.priority,
          spawned: false,
          room: nearestRoom
        })
      }
    })

    _.forEach(purpleFlags, function(flagObject){
      var flag = Game.flags[flagObject.name]

      /*if(flag.pos.room.controller.my){
        flag.remove()
      }*/

      if(flag.secondaryColor == COLOR_PURPLE){
        var job = {
          collect: 'reserve',
          room: flagObject.room,
          priority: 10,
          flag: flagObject.name
        }

        var foundJob = jobs.findOne({collect: 'reserve'}, {room: flagObject.room})

        if(!foundJob){
          Utils.addWithHash(job, jobs)
        }else{
          job.hash = foundJob.hash
        }
        if(!Utils.findCreepForJob(job, 100)){
          var nearestRoom = Utils.myNearestRoom(flagObject.room, rooms, CreepDesigner.caps.claim)

          spawnQueue.add({
            creep: CreepDesigner.createCreep({
              base: CreepDesigner.baseDesign.claim,
              cap: CreepDesigner.caps.claim,
              room: Game.rooms[nearestRoom]
            }),
            memory: {
              jobHash: job.hash
            },
            priority: job.priority,
            spawned: false,
            room: nearestRoom
          })
        }
      }else if(flag.secondaryColor == COLOR_RED){
        var job = {
          collect: 'claim',
          room: flagObject.room,
          priority: 10,
          flag: flagObject.name
        }

        Utils.addWithHash(job, jobs)

        if(!Utils.findCreepForJob(job)){
          var nearestRoom = Utils.myNearestRoom(flagObject.room, rooms, CreepDesigner.caps.claim)

          spawnQueue.add({
            creep: CreepDesigner.createCreep({
              base: CreepDesigner.baseDesign.claim,
              cap: CreepDesigner.caps.claim,
              room: Game.rooms[nearestRoom]
            }),
            memory: {
              jobHash: job.hash
            },
            priority: job.priority,
            spawned: false,
            room: nearestRoom
          })
        }
      }
    })

    _.forEach(redFlags, function(flagObject){
      var job = {
        collect: 'defend',
        room: flagObject.room,
        priority: 100,
        flag: flagObject.name
      }

      Utils.addWithHash(job, jobs)

      if(!Utils.findCreepForJob(job)){
        var nearestRoom = Utils.myNearestRoom(flagObject.room, rooms, CreepDesigner.caps.damage)

        spawnQueue.add({
          creep: CreepDesigner.createCreep({
            base: CreepDesigner.baseDesign.damage,
            cap: CreepDesigner.caps.damage,
            room: Game.rooms[nearestRoom]
          }),
          memory: {
            jobHash: job.hash
          },
          priority: job.priority,
          spawned: false,
          room: nearestRoom
        })
      }
    })

    _.forEach(yellowFlags, function(flagObject){
      if(Game.rooms[flagObject.room]){
        if(Game.flags[flagObject.name].memory.source){
          var sourceId = Game.flags[flagObject.name].memory.source
        }else{
          var source = Game.flags[flagObject.name].pos.lookFor(LOOK_SOURCES)[0]
          var sourceId = source.id
          Game.flags[flagObject.name].memory.source = source.id
        }

        var roomName = flagObject.name.split('-')[0]

        var job = {
          collect: 'harvest',
          source: sourceId,
          act: 'remoteWorker',
          targetRoom: roomName,
          remoteRoom: Game.flags[flagObject.name].pos.roomName,
          priority: 75
        }

        var container = _.filter(Game.flags[flagObject.name].pos.findInRange(FIND_STRUCTURES, 1), function(structure){
          return (structure.structureType == STRUCTURE_CONTAINER)
        })[0]

        if(container){
          job.target = container.id
        }

        Utils.addIfNotExist(job, jobs)

        var creeps = Utils.findCreepsForJob(job, 150)

        if(creeps.length < 1){
          spawnQueue.add({
            creep: CreepDesigner.createCreep({
              base: CreepDesigner.baseDesign.fastWork,
              cap: CreepDesigner.caps.fastWork,
              room: Game.rooms[roomName]
            }),
            memory: {
              jobHash: job.hash
            },
            priority: job.priority,
            spawned: false,
            room: roomName
          })
        }

        if(container){
          var moveJob = {
            collect: 'sourceCollect',
            from: container.id,
            priority: 70,
            act: 'remoteWorker',
            targetRoom: roomName,
            remoteRoom: Game.flags[flagObject.name].pos.roomName
          }

          Utils.addIfNotExist(moveJob, jobs)

          var creeps = Utils.findCreepsForJob(moveJob, 150)

          if(creeps.length < 1){
            spawnQueue.add({
              creepType: 'moveWork',
              memory: {
                jobHash: moveJob.hash
              },
              priority: moveJob.priority,
              spawned: false,
              room: roomName
            })
          }
        }
      }
    })

    _.forEach(blueFlags, function(flagObject){
      var destRoom = rooms.findOne({name: flagObject.room})

      var sourceRoomName = flagObject.name.split('-')[0]

      var sourceRoom = rooms.findOne({name: sourceRoomName})

      if(destRoom.storage && sourceRoom.storage){
        var job = {
          collect: 'sourceCollect',
          from: sourceRoom.storage,
          act: 'deliver',
          target: destRoom.storage,
          priority: 80
        }

        Utils.addIfNotExist(job, jobs)

        if(!Utils.findCreepForJob(job)){
          spawnQueue.add({
            creep: CreepDesigner.createCreep({
              base: CreepDesigner.baseDesign.move,
              cap: CreepDesigner.caps.move,
              room: Game.rooms[sourceRoomName]
            }),
            memory: {
              jobHash: job.hash
            },
            priority: job.priority,
            spawned: false,
            room: sourceRoomName
          })
        }
      }
    })

    _.forEach(brownFlags, function(flagObject){
      var flag = Game.flags[flagObject.name]

      if(Game.flags[flagObject.name].memory.target){
        var targetId = Game.flags[flagObject.name].memory.target
      }else{
        var structure = Game.flags[flagObject.name].pos.lookFor(LOOK_STRUCTURES)[0]
        var targetId = structure.id
        Game.flags[flagObject.name].memory.target = structure.id
      }

      var structure = Game.getObjectById(targetId)
      if(structure.hits < 150000){
        flag.remove()
        return
      }

      var job = {
        dismantle: targetId,
        collect: 'dismantle',
        actFilter: 'deliver',
        room: flag.pos.roomName,
        priority: 70
      }

      Utils.addIfNotExist(job, jobs)

      if(!Utils.findCreepForJob(job)){
        spawnQueue.add({
          creep: CreepDesigner.createCreep({
            base: CreepDesigner.baseDesign.slowWork,
            cap: CreepDesigner.caps.slowWork,
            room: Game.rooms[flag.pos.roomName]
          }),
          memory: {
            jobHash: job.hash
          },
          priority: job.priority,
          spawned: false,
          room: flag.pos.roomName
        })
      }
    })
  }
}

module.exports = FlagsController
