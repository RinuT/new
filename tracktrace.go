package main

import (
	"fmt"
	"encoding/json"
	"strings"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

func main() {
	//logger.SetLevel(shim.LogInfo)

	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}


type SmartContract struct {
}

type Product struct {
	ObjectType      			 string `json:"docType"`
	Uuid                         string `json:"Uuid"` //docType is used to distinguish the various types of objects in state database
	Material                     string `json:"Material"` //the fieldtags are needed to keep case from bouncing around
	Make                         string `json:"Make"`
	RawMaterialLocation          string `json:"RawMaterialLocation"`
	ProductStatus                string `json:"ProductStatus"` //the fieldtags are needed to keep case from bouncing around
	ShipmentStatus               string `json:"ShipmentStatus"`
	BatchCode                    string `json:"BatchCode"`
}

var ttFunctions = map[string]func(shim.ChaincodeStubInterface, []string) pb.Response{
	"create_product":     		createProduct,
	"search_product":     		searchProduct,
	"update_product_status":    updateProductStatus,
	"update_Shipment_status":	updateShipmentStatus,
}

// Create sample product
func (t *SmartContract) Init(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	fmt.Println("init is running " + function)

	Uuid := args[0]
	Material := args[1]
	Make := args[2]
	RawMaterialLocation := args[3]
	ProductStatus := args[4]
	ShipmentStatus := args[5]
	BatchCode := args[6]
	
	// ==== Create product and marshal to JSON ====
	ObjectType := "product"
	ProductStatus := strings.ToUpper(ProductStatus)
	Product := &Product{ObjectType, Uuid, Material, Make, RawMaterialLocation, ProductStatus, ShipmentStatus, BatchCode}
	orderJSONasBytes, err := json.Marshal(Product)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = stub.PutState(Uuid, orderJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(nil)
}


func (t *SmartContract) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()

	if function == "init" {
		return t.Init(stub)
	}
	ttFunc := ttFunctions[function]
	if ttFunc == nil {
		return shim.Error("Invalid invoke function.")
	}
	return ttFunc(stub, args)
}


//create a product using unique uuid

func createProduct(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	var newProductStatus string

	// if len(args) != 10 {
	// 	return shim.Error("Incorrect number of arguments. Expecting 10")
	// }

	// ==== Input sanitation ====
	fmt.Println("- start registerering shipment")

	Uuid := args[0]
	Material := args[1]
	Make := args[2]
	RawMaterialLocation := args[3]
	ProductStatus := args[4]
	ShipmentStatus := args[5]
	BatchCode := args[6]

	// ==== Check if order already exists ====
	orderAsBytes, err := stub.GetState(Uuid)
	if err != nil {
		return shim.Error("Failed to register shipment: " + err.Error())
	} else if orderAsBytes != nil {
		fmt.Println("This shipment already exists: " + Uuid)
		return shim.Error("This shipment already exists: " + Uuid)
	}

	// ==== Create order object and marshal to JSON ====
	
		ObjectType := "shipment"
		newProductStatus = strings.ToUpper(ProductStatus)
		Product := &Product{ObjectType, Uuid, Material, Make, RawMaterialLocation, newProductStatus, ShipmentStatus, BatchCode}
		fmt.Println(Product)
		orderJSONasBytes, err := json.Marshal(Product)
		if err != nil {
			return shim.Error(err.Error())
		}

		// === Save order to state ===
		err = stub.PutState(Uuid, orderJSONasBytes)
		if err != nil {
			return shim.Error(err.Error())
		}
	
	fmt.Println("- end registering shimpment")
	return shim.Success(nil)

}

//search the order details using order uuid
func searchProduct(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var Uuid, jsonResp string
	var err error

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting shipment Id to query")
	}

	Uuid = args[0]
	valAsbytes, err := stub.GetState(Uuid)
	if err != nil {
		jsonResp = "{\"Error\":\"Failed to get state for " + Uuid + "\"}"
		return shim.Error(jsonResp)
	} else if valAsbytes == nil {
		jsonResp = "{\"Error\":\"shipment does not exist: " + Uuid + "\"}"
		return shim.Error(jsonResp)
	}

	return shim.Success(valAsbytes)
}

func updateProductStatus(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) < 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	Uuid := args[0]
	newStatus := args[1]
	fmt.Println("- update Product Status ", Uuid, newStatus)

	orderAsBytes, err := stub.GetState(Uuid)
	if err != nil {
		return shim.Error("Failed to get product details:" + err.Error())
	} else if orderAsBytes == nil {
		return shim.Error("product does not exist")
	}

	orderToUpdate := Product{}
	err = json.Unmarshal(orderAsBytes, &orderToUpdate) //unmarshal it aka JSON.parse()
	if err != nil {
		return shim.Error(err.Error())
	}
	if orderToUpdate.ProductStatus != "TAMPERED"
	{
	orderToUpdate.Temperature = newStatus //change the temperature
	orderJSONasBytes, _ := json.Marshal(orderToUpdate)
	err = stub.PutState(ShipmentId, orderJSONasBytes) //rewrite the marble
	}
	else
		fmt.Println("You cannot change status of a tampered product")
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("- end updateTemperature (success)")
	return shim.Success(nil)
}
