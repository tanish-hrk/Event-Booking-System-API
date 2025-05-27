const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const Book = sequelize.define('Booking',{
 id: {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey:true,
  allowNull:false
 },

 user_id: {
  type: DataTypes.UUID,
  allowNull:false,
  references:{
   model:'users',
   key:'id'
  }
 },

 event_id:{
  type: DataTypes.UUID,
  allowNull:false,
  references:{
   model:'events',
   key:'id'
  }
 },

 seats:{
  type: DataTypes.INTEGER,
  allowNull:false,
  validate:{
   isInt:true,
   min:1,
   max:10
  }
 },

 amount:{
  type: DataTypes.DECIMAL(10,2),
  allowNull:false,
  validate:{
   isDecimal:true,
   min:0
  }
 },

 status:{
  type: DataTypes.ENUM('pending','confirmed','cancelled','refunded'),
  allowNull:false,
  defaultValue:'confirmed',
  validate:{
   isIn:[['pending','confirmed','cancelled','refunded']]
  }
 },

 booking_ref:{
  type: DataTypes.STRING(20),
  allowNull:false,
  unique:true
 },

 payment_stat:{
  type: DataTypes.ENUM('pending','completed','failed','refunded'),
  allowNull:false,
  defaultValue:'completed',
  validate:{
   isIn:[['pending','completed','failed','refunded']]
  }
 },

 special_req:{
  type: DataTypes.TEXT,
  allowNull:true,
  validate:{
   len:[0,500]
  }
 },

 booked_on:{
  type: DataTypes.DATE,
  allowNull:false,
  defaultValue: DataTypes.NOW
 },

 cancelled_on:{
  type: DataTypes.DATE,
  allowNull:true
 }
},{
 tableName:'bookings',
 indexes:[
  {fields:['user_id']},
  {fields:['event_id']},
  {fields:['status']},
  {fields:['payment_stat']},
  {unique:true,fields:['booking_ref']},
  {fields:['booked_on']}
 ],
 scopes:{
  active:{where:{status:'confirmed'}},
  cancelled:{where:{status:'cancelled'}},
  pending:{where:{status:'pending'}},
  paid:{where:{payment_stat:'completed'}}
 },
 hooks:{
  beforeCreate: async (bk)=>{
   if(!bk.booking_ref){
    bk.booking_ref = await makeBookingRef()
   }
  },
  beforeUpdate:(bk)=>{
   if(bk.changed('status') && bk.status==='cancelled'){
    bk.cancelled_on = new Date()
   }
  }
}
})

async function makeBookingRef(){
 let pre = 'BK'
 let time = Date.now().toString()
 let rand = Math.random().toString(36).substr(2,4).toUpperCase()
 return pre + time.slice(-8) + rand
}

Book.prototype.canCancel = function(){
 return this.status === 'confirmed' && this.payment_stat === 'completed'
}

Book.prototype.isActive = function(){
 return this.status === 'confirmed'
}

Book.prototype.refundAmount = function(){
 return this.status === 'cancelled' ? this.amount : 0
}

Book.getUserBooks = function(userId, opts={}){
 return this.findAll({
  where:{user_id:userId},
  include:['Event'],
  order:[['booked_on','DESC']],
  ...opts
 })
}

Book.getEventBooks = function(eventId, opts={}){
 return this.findAll({
  where:{event_id:eventId},
  include:['User'],
  order:[['booked_on','ASC']],
  ...opts
 })
}

Book.findByRef = function(ref){
 return this.findOne({
  where:{booking_ref:ref},
  include:['User','Event']
 })
}

Book.getEventIncome = async function(eventId){
 let res = await this.findAll({
  where:{
   event_id:eventId,
   status:'confirmed',
   payment_stat:'completed'
  },
  attributes:[
   [sequelize.fn('SUM',sequelize.col('amount')),'totalIncome'],
   [sequelize.fn('COUNT',sequelize.col('id')),'bookingCount'],
   [sequelize.fn('SUM',sequelize.col('seats')),'totalSeats']
  ]
 })
 return res[0] || {totalIncome:0, bookingCount:0, totalSeats:0}
}

module.exports = Book
