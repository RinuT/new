 /**
   * to display status with id
   * @param {org.acme.pharma_network.updateNewBatch} updateNewBatch -
   * @transaction
   */
  async function updateNewBatch(updateNewBatch) { 
    const DrugRegistry = await getAssetRegistry('org.acme.pharma_network.newDrug');
    const new_drug = await DrugRegistry.get(updateNewBatch.batch.batch.drugId);
    
    const registry = await getAssetRegistry('org.acme.pharma_network.newBatch');
    const factory = getFactory();
    const newBatch = factory.newResource('org.acme.pharma_network', 'newBatch', updateNewBatch.batch.batchCode);
    console.log(new_drug)
    new_drug.drug.quantity=(new_drug.drug.quantity+updateNewBatch.batch.batch.quantity)
    new_drug.drug.batch.push(updateNewBatch.batch);
    DrugRegistry.update(new_drug)
    console.log(newBatch)
    newBatch.batch=updateNewBatch.batch.batch
    registry.add(newBatch)
  }
/**
 * to display status with id
 * @param {org.acme.pharma_network.reportProblem} reportProblem -
 * @transaction
 */
async function reportProblem(reportProblem) { 
    
    const registry = await getAssetRegistry('org.acme.pharma_network.newBatch');
    const factory = getFactory();
    const newBatch = await registry.get(reportProblem.BatchCode);
  	const results = await query('selectbatch', {batchCode : reportProblem.BatchCode});
    newBatch.batch=results[0].batch
    newBatch.batch.problemReported="yes"
    newBatch.batch.pharmaReported=reportProblem.pharmaReported
    registry.update(newBatch)
  
    const DrugRegistry = await getAssetRegistry('org.acme.pharma_network.newDrug');
    const new_drug = await DrugRegistry.get(reportProblem.drugId);
    
    const OrderRegistry = await getAssetRegistry('org.acme.pharma_network.Order');

    for(let i=0;i<new_drug.drug.batch.length;i++){
      if(new_drug.drug.batch[i].batchCode==reportProblem.BatchCode){
        new_drug.drug.batch[i].batch.pharmaReported=reportProblem.pharmaReported
        new_drug.drug.batch[i].batch.problemReported='yes'
     }
    }
    DrugRegistry.update(new_drug)
  
    for(let j=0;j<newBatch.batch.orders.length;j++){ 
    const new_order = await OrderRegistry.get(newBatch.batch.orders[j]);
    for(let m=0;m<new_order.batch.length;m++){
     if(new_order.batch[m].batchCode==reportProblem.BatchCode){
       new_order.batch[m].Batch.pharmaReported=reportProblem.pharmaReported
       new_order.batch[m].Batch.problemReported='yes'
    }
    }
    OrderRegistry.update(new_order)
   }
    const create = factory.newEvent('org.acme.pharma_network', 'reportProb');
    create.batchCode = results[0].batchCode;  
    create.batch = results[0].batch;
      emit(create);   
  }
  /**
   * Place an order for a drug
   * @param {org.acme.pharma_network.PlaceOrder} placeOrder - the PlaceOrder transaction
   * @transaction
   */
  async function placeOrder(orderRequest) {
    var factory = getFactory();
    var namespace = 'org.acme.pharma_network';
    const registry = await getAssetRegistry('org.acme.pharma_network.newDrug');
    const new_drug = await registry.get(orderRequest.drug.din);
    const batchregistry = await getAssetRegistry('org.acme.pharma_network.newBatch');
    var order = factory.newResource(namespace, 'Order', orderRequest.orderId);
   
    if (orderRequest.drug.drugStatus === 'WITHDRAWN') {
        throw new Error('Order cannot be placed as drug is withdrawn'); 
    }else{
        if(orderRequest.quantity <= new_drug.drug.quantity)
    {
      order.drug = orderRequest.drug;
      order.quantity = orderRequest.quantity;
      order.orderStatus = 'WITH_MANUFACTURER';
      order.moisture=orderRequest.moisture
      order.shake=orderRequest.shake
      order.temperature=orderRequest.temperature
      order.batch=orderRequest.batch
       let sum=0;
       let sup=orderRequest.quantity;
       let need=0;
       for(let i=0;i<new_drug.drug.batch.length;i++){
          need=sup-sum
          console.log(new_drug.drug.batch[i].batchCode)
          
          var orderNew = factory.newResource(namespace, 'newOrderBatch',new_drug.drug.batch[i].batchCode);
          if(sum<sup){
           
         if(new_drug.drug.batch[i].batch.quantity!=0){
	 	 const batch = await batchregistry.get(new_drug.drug.batch[i].batchCode);
         batch.batch.orders.push(orderRequest.orderId)         
           if(need==new_drug.drug.batch[i].batch.quantity||need>new_drug.drug.batch[i].batch.quantity){
           
            let temp=new_drug.drug.batch[i].batch.quantity
            sum+=new_drug.drug.batch[i].batch.quantity 
            orderNew.Batch=new_drug.drug.batch[i].batch;
            orderNew.Batch.orderquantity =temp
            order.batch.push(orderNew)
            //if(need==new_drug.drug.batch[i].batch.quantity)
            new_drug.drug.batch[i].batch.quantity=0
            
          }
          else{
            sum+=need
            new_drug.drug.batch[i].batch.quantity=new_drug.drug.batch[i].batch.quantity-need 
            orderNew.Batch=new_drug.drug.batch[i].batch
            orderNew.Batch.orderquantity=need 
            order.batch.push(orderNew)
          }
           batchregistry.update(batch)
         }
      }else if(sum==sup){
          break;
      }
            
       }
  
      if(orderRequest.temperature>50){
        order.drugStatus="WITHDRAWN"
      } else{
        order.drugStatus=orderRequest.drugStatus
      }
      
      order.orderer = factory.newRelationship(namespace, 'Pharmacy', orderRequest.orderer.getIdentifier());
        
      return getAssetRegistry(order.getFullyQualifiedType())
        .then(function (assetRegistry) {
        assetRegistry.add(order);
        new_drug.drug.quantity = (new_drug.drug.quantity-orderRequest.quantity)
        return registry.update(new_drug);
        
      })
      
        .then(function () {
        var placeOrderEvent = factory.newEvent(namespace, 'PlaceOrderEvent');
        placeOrderEvent.orderId = order.orderId;      
        placeOrderEvent.drug = order.drug;
        placeOrderEvent.orderer = order.orderer;
        placeOrderEvent.quantity = order.quantity;
        placeOrderEvent.temperature = order.temperature;
        placeOrderEvent.orderStatus = order.orderStatus;
      emit(placeOrderEvent);
        
      });
      
  
    } else
       throw new Error('Order cannot be placed as order quantity is graeter that available drug quantity'); 
         }
  
  }
 
  /**
   * to display status with id
   * @param {org.acme.pharma_network.register} create -
   * @transaction
   */
  async function create(createDrug) {   
       const registry = await getAssetRegistry('org.acme.pharma_network.newDrug');
      const factory = getFactory();
  
      // Create the bond asset.
      const newDrug = factory.newResource('org.acme.pharma_network', 'newDrug', createDrug.din);
      newDrug.drug = createDrug.drug;
      const create = factory.newEvent('org.acme.pharma_network', 'create');
      create.din = newDrug.din;
      create.drug = newDrug.drug;
      emit(create);
      // Add the bond asset to the registry.
      await registry.add(newDrug);
  }
  /**
   * to display status with id
   * @param {org.acme.pharma_network.search} search -
   * @transaction
   */
  async function search(search) {   
       const factory = getFactory();
       const results = await query('selectdrug', {din : search.din});
       const create = factory.newEvent('org.acme.pharma_network', 'create');
       create.din = results[0].din;
       create.drug = results[0].drug;
       emit(create);
  }
  /**
   * to display status with id
   * @param {org.acme.pharma_network.searchOrder} searchOrder -
   * @transaction
   */
  async function searchOrder(searchOrder) {   
    const factory = getFactory();
    const results = await query('selectOrder', {orderId : searchOrder.orderId});
    const create = factory.newEvent('org.acme.pharma_network', 'searchOrderEvent');
    create.orderId = results[0].orderId;
    create.quantity = results[0].quantity;
    create.temperature = results[0].temperature;
    create.moisture = results[0].moisture;
    create.shake = results[0].shake;
    create.orderStatus = results[0].orderStatus;
    create.drugStatus = results[0].drugStatus;
       emit(create);
  }
  /**
   * to display status with id
   * @param {org.acme.pharma_network.registerSupllier} registerSupllier -
   * @transaction
   */
  async function registerSupllier(registerSupllier) {   
    const registry = await getAssetRegistry('org.acme.pharma_network.newSupplier');
    const factory = getFactory();
    const newSupplier = factory.newResource('org.acme.pharma_network', 'newSupplier', registerSupllier.supplierId);
    newSupplier.components = registerSupllier.components;
      await registry.add(newSupplier);
  }
  
  
  
  /**
   * Publish a new bond
   * @param {org.acme.pharma_network.temepratureUpdate} temepratureUpdate - the publishBond transaction
   * @transaction
   */
  async function temepratureUpdate(temepratureUpdate) {  // eslint-disable-line no-unused-vars
      const factory = getFactory();
      const registry = await getAssetRegistry('org.acme.pharma_network.Order');
      const new_Order = await registry.get(temepratureUpdate.orderId);
      new_Order.temperature =  temepratureUpdate.temperature
     if(temepratureUpdate.moisture>'50' || temepratureUpdate.shake>'50'||temepratureUpdate.temperature>'50')
           {
             new_Order.drugStatus='WITHDRAWN';
           }
      await registry.update(new_Order);
      const temepratureHistory = factory.newEvent('org.acme.pharma_network', 'temepratureHistory');
      temepratureHistory.orderId = new_Order.orderId;
      temepratureHistory.temperature = new_Order.temperature;
      temepratureHistory.orderStatus = new_Order.orderStatus;
      emit(temepratureHistory);
  }
  
  /**
   * Search the product by uuid
   * @param {org.acme.pharma_network.temperatureEvent} new_Order - the publishBond transaction
   * @transaction
   */
  async function temperatureEvent(search) {  // eslint-disable-line no-unused-vars
        const factory = getFactory();
        const results = await query('getHistorianRecords');
       if(results.length>0) {
      for(let i=0;i<results.length;i++){
      if(search.orderId==results[i].eventsEmitted[0].orderId){
      const temepratureHistory = factory.newEvent('org.acme.pharma_network', 'temepratureHistory');
      temepratureHistory.orderId = results[i].eventsEmitted[0].orderId;
      temepratureHistory.temperature = results[i].eventsEmitted[0].temperature;
      temepratureHistory.orderStatus = results[i].eventsEmitted[0].orderStatus;
      emit(temepratureHistory);
       }
      }
    }
    else
      throw new Error('Product  not available for the given UUID');   
  }
  /**
   * Update the status of an order
   * @param {org.acme.pharma_network.UpdateOrderStatus} updateOrderStatus - the UpdateOrderStatus transaction
   * @transaction
   */
  async function updateOrderStatus(updateOrderRequest) {
      var factory = getFactory();
      var namespace = 'org.acme.pharma_network';
      const results =await query('selectorderdetail', {orderId :updateOrderRequest.order.orderId});
      const orderRegistry = await getAssetRegistry('org.acme.pharma_network.Order'); 
      const new_order = await orderRegistry.get(updateOrderRequest.order.orderId);
         if (updateOrderRequest.order.drugStatus === 'WITHDRAWN') {
                throw new Error('Order cannot be shipped as drug is withdrawn'); 
         }
         else
         {
          if(results.length>0) {
            new_order.orderStatus = updateOrderRequest.orderStatus;
            new_order.moisture=updateOrderRequest.moisture;
            new_order.shake=updateOrderRequest.shake;
            new_order.temperature=updateOrderRequest.temperature;
            await orderRegistry.update(new_order); 
           if(updateOrderRequest.moisture>'50' || updateOrderRequest.shake>'50'||updateOrderRequest.temperature>'50')
           {
             new_order.drugStatus='WITHDRAWN';
             await orderRegistry.update(new_order);
           }
           
           const temepratureHistory = factory.newEvent('org.acme.pharma_network', 'UpdateOrderStatusEvent');
            temepratureHistory.orderId = new_order.orderId;
           // temepratureHistory.temperature = new_order.temperature;
            temepratureHistory.orderStatus = new_order.orderStatus;
            for(let i=0;i<new_order.batch.length;i++){
            temepratureHistory.problemReported[i]=new_order.batch[i].Batch.problemReported
             temepratureHistory.pharmaReported[i]=new_order.batch[i].Batch.pharmaReported 
            }
            emit(temepratureHistory);  
           }
         }
      
  }
  
  /**
   * to display status with id
   * @param {org.acme.pharma_network.displayDrugs} display -
   * @transaction
   */
  async function displayDrugs() {   
      const results = await query('selectdrugs');
      const factory = getFactory();
      const displayDrugsEvent = factory.newEvent('org.acme.pharma_network', 'displayDrugsEvent');
            if(results.length>0)
          {
            for(let i=0;i<results.length;i++)
            {
               displayDrugsEvent.din = results[i].din;
               displayDrugsEvent.drugStatus = results[i].drug.drugStatus;
                 emit(displayDrugsEvent);  
            }
           
          }
  }
  
  
  /**
   * Update the status of a drug
   * @param {org.acme.pharma_network.UpdateDrugStatus} updateDrugStatus - the UpdateDrugStatus transaction
   * @transaction
   */
  async function updateDrugStatus(updateDrugRequest) {  
    var factory = getFactory();
    var namespace = 'org.acme.pharma_network';
    const results =await query('selectorderdetail', {orderId :updateDrugRequest.order.orderId});
    const orderRegistry = await getAssetRegistry('org.acme.pharma_network.Order'); 
    const new_order = await orderRegistry.get(updateDrugRequest.order.orderId);
         if (updateDrugRequest.order.drugStatus === 'WITHDRAWN') {
                throw new Error('Order cannot be shipped as drug is withdrawn'); 
         }
         else
         {
          if(results.length>0) {
            new_order.drugStatus = updateDrugRequest.drugStatus;
            new_order.moisture=updateDrugRequest.moisture;
            new_order.shake=updateDrugRequest.shake;
            new_order.temperature=updateDrugRequest.temperature;
            await orderRegistry.update(new_order); 
           if(updateDrugRequest.moisture>'50' || updateDrugRequest.shake>'50'||updateDrugRequest.temperature>'50')
           {
             new_order.drugStatus='WITHDRAWN';
             await orderRegistry.update(new_order);
           }
           
           const temepratureHistory = factory.newEvent('org.acme.pharma_network', 'temepratureHistory');
            temepratureHistory.orderId = new_order.orderId;
            temepratureHistory.temperature = new_order.temperature;
            temepratureHistory.orderStatus = new_order.orderStatus;
            emit(temepratureHistory);  
                }
         }
      
  }
 
  
  {
    "$class": "org.acme.pharma_network.updateNewBatch",
    "batch": {
      "$class": "org.acme.pharma_network.newBatch",
      "batchCode": "b10",
      "batch": {
        "$class": "org.acme.pharma_network.Batch",
        "drugId": "d2",
        "quantity": 20,
        "orderquantity": 0,
      "problemReported": "",
      "pharmaReported": "",
      "orders": [],
        "supplier": [{
            "$class": "org.acme.pharma_network.newSupplier",
            "id": "3685",
            "components": [{
                "$class": "org.acme.pharma_network.Component",
                "manufactureTemperature": "",
                "name": ""
              },{
                "$class": "org.acme.pharma_network.Component",
                "manufactureTemperature": "",
                "name": ""
              }]
          },{
            "$class": "org.acme.pharma_network.newSupplier",
            "id": "s1",
            "components": [{
                "$class": "org.acme.pharma_network.Component",
                "manufactureTemperature": "23",
                "name": "c1"
              },{
                "$class": "org.acme.pharma_network.Component",
                "manufactureTemperature": "34",
                "name": "c2"
              }]
              }]
      }
    }
  }
