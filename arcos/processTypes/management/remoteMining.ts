import {Process} from '../../os/process'
import {Utils} from '../../lib/utils'

export class RemoteMiningManagementProcess extends Process{
  type = AOS_REMOTE_MINING_MANAGEMENT_PROCESS
  metaData: MetaData[AOS_REMOTE_MINING_MANAGEMENT_PROCESS]

  run(){
    let flag = Game.flags[this.metaData.flag]

    if(!flag){
      this.completed = true
      return
    }

    if(!flag.memory.source){
      let sources = <Source[]>flag.pos.lookFor(LOOK_SOURCES)
      flag.memory.source = sources[0].id
    }

    let deliverRoom = flag.name.split('-')[0]

    let colony = this.kernel.memory.empire.getColony(deliverRoom)
    if(colony){
      if(!colony.hasRoom(flag.pos.roomName)){
        colony.addRoom(flag.pos.roomName)
      }
    }

    if(!Game.rooms[deliverRoom]){
      this.completed = true
      return
    }

    if(this.metaData.containerId){
      if(Game.rooms[flag.pos.roomName] && !Game.getObjectById(this.metaData.containerId)){
        this.metaData.containerId = undefined
        return
      }

      let transportCreep = Game.creeps[this.metaData.transportCreep!]
      if(!transportCreep){
        let spawned = Utils.spawn(
          this.kernel,
          deliverRoom,
          'transporter',
          't-' + flag.pos.roomName + '-' + Game.time,
          {}
        )

        if(spawned){
          this.metaData.transportCreep = 't-' + flag.pos.roomName + '-' + Game.time

          this.kernel.addProcessIfNotExist(AOS_TRANSPORTER_LIFETIME_PROCESS, 'tlf-' + flag.pos.roomName + '-' + Game.time, this.priority, {
            creep: 't-' + flag.pos.roomName + '-' + Game.time,
            sourceContainer: this.metaData.containerId,
            destinationContainer: Game.rooms[deliverRoom].storage!.id
          })
        }
      }
    }else{
      // Meta Datas Container ID is empty
      if(Game.rooms[flag.pos.roomName]){
        // We can get the room of the flag
        let container = _.filter(flag.pos.findInRange(FIND_STRUCTURES, 1), (structure) => {
          return structure.structureType === STRUCTURE_CONTAINER
        })[0]
        if(container){
          this.metaData.containerId = container.id
        }
      }
    }
  }
}
