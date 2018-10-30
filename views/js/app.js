angular.module("SuiteStartup", ['ngRoute', 'infinite-scroll','chart.js','ngCookies'])
    // .run(function($rootScope) {
    //     alert($rootScope.initialQuery);
    //     if (!($rootScope.initialQuery)) {
    //         $rootScope.initialQuery = '';
    //     }
    // })
    .config(["$routeProvider", function($routeProvider) {
        console.log("Hit Route Provider!!");
        $routeProvider
            .when("/listings", {
                templateUrl: "listings",
                controller: "ListingsController"
            })
            .when("/listings.json", {
                templateUrl: "listings",
                controller: "ListingsController"
            })
            .when('/listing/:mlsID', {
                templateUrl: "detailsPage",
                controller: "DetailsController"
            })
            .when("/savedListings", {
                templateUrl: "savedListings",
                controller: "SavedController"
            })
            .when("/savedListings.json", {
                templateUrl: "savedListings",
                controller: "SavedController"
            })
            .when('/savedListings/saved', {
                templateUrl: "savedListings",
                controller: "SavedController"
            })
            .when('/initialQuery', {
                templateUrl: "initialQuery",
                controller: "InitialController"
            })

    }])
    .controller('ClientController', ['$scope', 'Clients', function($scope, Clients) {
        $scope.clients = [];
        $scope.clientAppreciation = [];
        Clients.getClients($scope);

        // var today = new Date();
        // alert(today.getFullYear());
        // alert(today.getMonth());

        //function with parameters ORIGINALVALUE and NEWHOODNAME and PROPTYPE
        //pass this data in to query [proptype]MedianVals based on proptype
        //this will be a post in service that will return current value
        //compute and store in scope variable using originalValue and newValue
        //display scope var in front end

        $scope.deleteClient = function(client) {
            e = angular.element(document.querySelector('#row-' + client.MLSNumber.S));
            e.css('display', 'none');
            Clients.deleteClient(client);
        }
    }])
    .controller('InitialController', ['$cookies', '$scope', "InitialQuery", function($cookies, $scope, InitialQuery) {
        // $scope.setZip = function() {
        //     console.log('post button "Go!" clicked');
        //     console.log();
        //     InitialQuery.setInitial($rootScope, $scope.queryZip);
        // }
        $scope.updateInitial = function() {
            // if ($scope.queryZip) {
            //     if (!(/^\d+$/.test($scope.queryZip)) || $scope.queryZip.length > 7) {
            //         $scope.queryZip = $scope.queryZip.replace(/[^0-9]/g, '').slice(0,7);
            //     }
                //$cookies.put("initialQuery", $scope.queryZip);
                //console.log($cookies.get("initialQuery"));
            //}
        }
    }])
    .controller('MainCtrl', ['$scope', '$window', function($scope, $window) {
        $scope.memId = '60';  
        $scope.getMember = function(id) {
            return '60';
        };
        console.log($window)
    }])
    .controller("RadarCtrl", function ($scope) {
        $scope.labels = ["Download Sales", "In-Store Sales", "Mail-Order Sales"];
        $scope.data = [300, 500, 100];
    })
    //////////////LISTINGS PAGE CONTROLLER//////////////
    .controller("ListingsController", ["Listings", "$scope", "$location", "$cookies", function(Listings, $scope, $location, $cookies) {
        // console.log($cookies.get("initialQuery"));
        $scope.initial = $cookies.get("initialQuery");
        $scope.thumb = false;
        $scope.moneyModels = {};
        $scope.n = 0
        /////////////SETTING UP FILTERS//////////////
        $scope.minPrices = ['$0', '$50,000', '$100,000', '$150,000', '$200,000', '$250,000', '$300,000', '$400,000', '$500,000', 'No Min $'];
        $scope.maxPrices = ['$50,000', '$100,000', '$150,000', '$200,000', '$250,000', '$300,000', '$400,000', '$500,000', 'No Max $'];
        $scope.beds = ['All Beds', '1+', '2+', '3+', '4+', '5+', '6+'];
        $scope.baths = ['1+', '2+', '3+', '4+', '5+', '6+'];
        $scope.propertyTypes = [{type: 'Single Family', selected: true}, 
                                {type: 'Condo/Townhouse', selected: true}];
                                // {type: 'House', selected: true},
                                // {type: 'Lot', selected: true},
                                // {type: 'Manufactured', selected: true}, 
                                // {type: 'SFR', selected: true}];
        $scope.maxHOA = ['Any', '$100/month', '$200/month', '$300/month', '$400/month', '$500/month'];
        //////GET LISTINGS FROM DB AND ASSIGN TO SCOPE VAR////////////
        Listings.getListings($scope);

        $scope.sortROI = function(listing) {
            return parseFloat(listing.ROI.S);
        }
        $scope.setMaxVals = function(min) {
            if (min == 'No Min $') {
                $scope.maxPrices = ['$50,000', '$100,000', '$150,000', '$200,000', '$250,000', '$300,000', '$400,000', '$500,000', 'No Max $'];
            } else {
                var maxAmount = parseInt(min.replace(/[^0-9-.]/g, ''));
                for(var i=0; i<9; i++){
                    maxAmount += 50000;
                    stringValue = "$"+String(maxAmount/1000)+",000";
                    $scope.maxPrices[i] = stringValue;
                }
                $scope.maxPrices[9] = 'No Max $'; 
            }
            $scope.MaxPriceSelected = $scope.maxPrices[$scope.maxPrices.length-1];
        }
        $scope.priceToFloat = function(price) {
            parseFloat(price.replace(/[^0-9-.]/g, ''));
        }
        $scope.filter = function(listingBeds, listingBaths, listingPrice, listingCity, listingZip, listingStreetNumber, listingStreetName, listingStreetSuffix, listingMLS, listingPropType, listingSqft, listingYearBuilt, monthHOA, listingCapRate, listingROI) { 
            var validBeds = ($scope.BedFilter == 'All Beds') || (listingBeds >= parseFloat($scope.BedFilter.match(/\d+/)[0]));
            var validBaths = ($scope.BathFilter == '1+') || (parseFloat(listingBaths) >= parseFloat($scope.BathFilter.match(/\d+/)[0]));
            var validMinPrice = $scope.MinPriceSelected == 'No Min $' || (listingPrice >= parseFloat($scope.MinPriceSelected.replace(/[^0-9-.]/g, '')));
            var validMaxPrice = $scope.MaxPriceSelected == 'No Max $' || (listingPrice <= parseFloat($scope.MaxPriceSelected.replace(/[^0-9-.]/g, '')));
            var address = String(listingStreetNumber) + ' ' + listingStreetName + ' ' + listingStreetSuffix;
            var validLocation = listingCity.toLowerCase().includes($scope.LocationFilter.toLowerCase()) || String(listingZip).includes($scope.LocationFilter) || address.toLowerCase().includes($scope.LocationFilter.toLowerCase()) || String(listingMLS).includes($scope.LocationFilter);
            var validSqft = (listingSqft >= parseFloat($scope.sqftMinFilter) || isNaN(parseFloat($scope.sqftMinFilter))) && (listingSqft <= parseFloat($scope.sqftMaxFilter) || isNaN(parseFloat($scope.sqftMaxFilter)));
            var validYear = (listingYearBuilt >= parseFloat($scope.yearBuiltMin) || isNaN(parseFloat($scope.yearBuiltMin)) || $scope.yearBuiltMin.length != 4) && (listingYearBuilt <= parseFloat($scope.yearBuiltMax) || isNaN(parseFloat($scope.yearBuiltMax)) || $scope.yearBuiltMax.length != 4);
            var validPropType = false;
            for (var i=0; i<$scope.propertyTypes.length; i++) {
                if ($scope.propertyTypes[i].type == listingPropType) {
                    if ($scope.propertyTypes[i].selected) {
                        validPropType = true;
                    }
                    break;
                }
            }

            var validHOA = $scope.HOAFilter == 'Any' || parseFloat(monthHOA) <= parseFloat($scope.HOAFilter.substring(1,4));
            var validCapRate = $scope.CapRateFilter == '' || isNaN(parseFloat($scope.CapRateFilter)) || parseFloat(listingCapRate) >= parseFloat($scope.CapRateFilter);
            var validROI = $scope.ROIFilter == '' || isNaN(parseFloat($scope.ROIFilter)) || parseFloat(listingROI) >= parseFloat($scope.ROIFilter);

            return validBeds && validBaths && validMinPrice && validMaxPrice && validLocation && validSqft && validYear && validPropType && validHOA && validCapRate && validROI;
        
        }
        $scope.showROI = function(rentString) {
            return rentString != '-1';
        }
        $scope.toggleSelected = function(type) {
            type.selected = !type.selected;
        }
        $scope.listingData = function (listing) {
            $scope.selectedListing = listing;
            $scope.selectedPrice = String(listing.ListPrice.N);
            $scope.selectedListingROI = listing.ROI.S + '%';
            $scope.downPayment = String(.2 * listing.ListPrice.N);
            $scope.closingCosts = String(.03 * listing.ListPrice.N);
            $scope.interestRates = '4.0%';
            $scope.loanTerm = '30 years';
            $scope.downPayPer = '20%';
            $scope.closeCostPer = '3%';
            $scope.vacancyRate = '5%';
            $scope.manageFeePer = '8%';
            $scope.maintenanceCostPer = '1%';
            $scope.managementFee = String(.08 * parseFloat(listing.Rent.S));
            $scope.maintenanceCost = String((.01 * listing.ListPrice.N)/12);
            $scope.insuranceTax = String((.002 * listing.ListPrice.N)/12);
            $scope.showModal = true;
            //$scope.DetailsPageROI;
            $scope.ROI = listing.ROI.S + '%';
            $scope.CapRate = listing.CapRate.S + '%';
            $scope.rates = {
                downPPROICalc: '20%',
                closingCPROICalc: '3%',
                interestRateROICalc: '4%',
                vacancyROICalc: '5%',
                manageFPROICalc: '8%',
                maintenancePROICalc: '1%'
            };

            $scope.moneyModels = {
                priceROICalc: accounting.formatMoney(listing.ListPrice.N).split('.')[0], 
                downPayROICalc: accounting.formatMoney(parseFloat($scope.rates.downPPROICalc.replace(/[^0-9-.]/g, '')) * .01 * listing.ListPrice.N), 
                closingCostROICalc: accounting.formatMoney(parseFloat($scope.rates.closingCPROICalc.replace(/[^0-9-.]/g, '')) * .01 * listing.ListPrice.N), 
                cashFlowROICalc: accounting.formatMoney(parseFloat(listing.CashFlow.S)), 
                rentROICalc: accounting.formatMoney(parseFloat(listing.Rent.S)), 
                mortgageROICalc: accounting.formatMoney(parseFloat(listing.MortFee.S)), 
                manageFeeROICalc: accounting.formatMoney(parseFloat($scope.rates.manageFPROICalc.replace(/[^0-9-.]/g, '')) * .01 * parseFloat(listing.Rent.S)),
                maintenanceROICalc: accounting.formatMoney((parseFloat($scope.rates.maintenancePROICalc.replace(/[^0-9-.]/g, '')) * .01 * listing.ListPrice.N)/12), 
                propTaxPROICalc: accounting.formatMoney(parseFloat(listing.PropTax.S)), 
                propInsPROICalc: '$0'//accounting.formatMoney((.002 * listing.ListPrice.N)/12)
            };
            if (listing.Rent.S == '-1') {
                $scope.moneyModels.rentROICalc = 'N/A';
                $scope.ROI = 'Set Rent!'
            }

            $scope.wordy = {
                hoaROICalc: accounting.formatMoney(parseFloat(listing.MonthHOA.S)).split('.')[0],
                loanTermROICalc: '30 years'
            };
            $scope.memId = '70';
            $scope.labels = ["ROI"];
            $scope.colours = ['#72C02C', '#D3D3D3'];
            if ($scope.ROI == 'Set Rent!') {
                $scope.data = [0, 100 - 0];
            } else {
                $scope.data = [parseFloat(listing.ROI.S), 100 - parseFloat(listing.ROI.S)];
                if (listing.ROI.S >= 100) {
                    $scope.data = [100, 0];
                }
                if (listing.ROI.S <= 0) {
                    $scope.data = [(-1*listing.ROI.S), 100 - (-1*listing.ROI.S)];
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                }
                if (listing.ROI.S <= -100) {
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                    $scope.data = [100, 0];
                }
            }
            
            $scope.myInterval = 3000;;
            var photoArray = [];
            // var count = 1;
            var limit = listing.PhotoCount.N;
            photoArray.push({
                image: 'https://s3.amazonaws.com/listing-images1/img/' + listing.Matrix_Unique_ID.N + '/' + '1' + '.jpeg'
            });
            // while (count <= 1 && count <= limit) {
            //     console.log(limit);
            //     photoArray.push({
            //         image: 'https://s3.amazonaws.com/listing-images1/img/' + listing.Matrix_Unique_ID.N + '/' + count + '.jpeg'
            //     });
            //     count = count + 1;
            // }

            Chart.defaults.global.legend.display = false;
            Chart.defaults.global.tooltips.enabled = false;

            console.log(photoArray)
            $scope.slides = photoArray
            
            $scope.options = {
                cutoutPercentage: 82.5,
                scales: {
                    paddingLeft: 0,
                },
                segmentShowStroke: false,
                responsive: false,  // set to false to remove responsiveness. Default responsive value is true.
                borderWidth: 0,
            }
        }
        $scope.getMember = function(id) {
            return '60';
        };
        $scope.close = function () {
            $scope.showModal = false;
        };

        $scope.scroll = function (n) {
            $scope.n += 24;
        }
        $scope.adjustGivenPrice = function(obj, key) {
            var thisPrice = parseFloat(accounting.unformat(obj[key]));
            var downpayrate = parseFloat($scope.rates.downPPROICalc.replace(/[^0-9-.]/g, ''))/100.00;
            var closecostrate = parseFloat($scope.rates.closingCPROICalc.replace(/[^0-9-.]/g, ''))/100.00;
            var maintenancefee = parseFloat($scope.rates.maintenancePROICalc.replace(/[^0-9-.]/g, ''))/100.00;

            var thisDownPay = thisPrice * downpayrate;
            var thisCloseCost = thisPrice * closecostrate;
            var thisMaintenance = thisPrice * maintenancefee / 12.00;
               
            
            if (thisDownPay < 0.005) {
                obj['downPayROICalc'] = '$0';
            } else {
                obj['downPayROICalc'] = accounting.formatMoney(thisDownPay);
            }
            if (thisCloseCost < 0.005) {
                obj['closingCostROICalc'] = '$0';
            } else {
                obj['closingCostROICalc'] = accounting.formatMoney(thisCloseCost);
            }
            if (thisMaintenance < 0.005) {
                obj['maintenanceROICalc'] = '$0';
            } else {
                obj['maintenanceROICalc'] = accounting.formatMoney(thisMaintenance);
            }
            
        }
        $scope.ROICalc = function (str, obj, key) {
            if ($scope.moneyModels.rentROICalc == 'N/A') {
                var roi = 0;
            
                //Set ROI chart data and scope ng-model
                $scope.memId = '70';
                $scope.labels = ["ROI"];
                $scope.colours = ['#72C02C', '#D3D3D3'];
                $scope.data = [roi, 100 - roi];
                if (roi >= 100) {
                    $scope.data = [100, 0];
                }
                if (roi <= 0) {
                    $scope.data = [(-1*roi), 100 - (-1*roi)];
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                }
                if (roi <= -100) {
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                    $scope.data = [100, 0];
                }
                $scope.ROI = 'Set Rent!'
            } else {
                ///////////////BEGININNING OF IF RENT IS VALUE///////////////
                ////////CALCULATE INPUTS BASED ON CHANGES//////////
                if (str == 'money') {
                    if (parseFloat(String(obj[key]).replace(/[^0-9-.]/g, '')) < 0.005) {
                        obj[key] = '$0';
                    } else {
                        obj[key] = accounting.formatMoney(parseFloat(String(obj[key]).replace(/[^0-9-.]/g, '')));
                    }
                    if (key == 'priceROICalc') {
                        $scope.adjustGivenPrice(obj, key);
                    }
                    else if (key == 'rentROICalc')
                    {
                        //Set management fee
                        var thisRent = parseFloat(accounting.unformat(obj[key]));
                        var managerate = parseFloat($scope.rates.manageFPROICalc.replace(/[^0-9-.]/g, ''))/100.00;
                        var thisManageFee = thisRent * managerate;
                        if (thisManageFee < 0.005) {
                            obj['manageFeeROICalc'] = '$0';
                        } else {
                            obj['manageFeeROICalc'] = accounting.formatMoney(thisManageFee);
                        }
                    }
                    else if (key == 'downPayROICalc')
                    {  
                        var newPrice = parseFloat(accounting.unformat(obj[key])) / (parseFloat($scope.rates.downPPROICalc.replace(/[^0-9-.]/g, ''))/100.00);
                        if (newPrice < 0.005) {
                            obj['priceROICalc'] = '$0';
                        } else {
                            obj['priceROICalc'] = accounting.formatMoney(newPrice);
                        }
                        $scope.adjustGivenPrice(obj, 'priceROICalc');
                    }
                    else if (key == 'closingCostROICalc')
                    {
                        var newPrice = parseFloat(accounting.unformat(obj[key])) / (parseFloat($scope.rates.closingCPROICalc.replace(/[^0-9-.]/g, ''))/100.00);
                        if (newPrice < 0.005) {
                            obj['priceROICalc'] = '$0';
                        } else {
                            obj['priceROICalc'] = accounting.formatMoney(newPrice);
                        }
                        $scope.adjustGivenPrice(obj, 'priceROICalc');
                    }
                    else if (key == 'manageFeeROICalc')
                    { 
                        var newRent = parseFloat(accounting.unformat(obj[key])) / (parseFloat($scope.rates.manageFPROICalc.replace(/[^0-9-.]/g, ''))/100.00);
                        if (newRent < 0.005) {
                            obj['rentROICalc'] = '$0';
                        } else {
                            obj['rentROICalc'] = accounting.formatMoney(newRent);
                        } 
                    }   
                    else if (key == 'maintenanceROICalc') 
                    {
                        var newPrice = 12 * parseFloat(accounting.unformat(obj[key])) / (parseFloat($scope.rates.maintenancePROICalc.replace(/[^0-9-.]/g, ''))/100.00);
                        if (newPrice < 0.005) {
                            obj['priceROICalc'] = '$0';
                        } else {
                            obj['priceROICalc'] = accounting.formatMoney(newPrice);
                        }
                        $scope.adjustGivenPrice(obj, 'priceROICalc'); 
                    }
                }
                else if (str == 'percent') 
                {            
                    obj[key] = obj[key].replace(/[^0-9-.]/g, '') + "%";
                    var thisPercent = parseFloat(obj[key].replace(/[^0-9-.]/g, ''));
                    var thisPrice = parseFloat($scope.moneyModels.priceROICalc.replace(/[^0-9-.]/g, ''));
                    var rent = parseFloat($scope.moneyModels.rentROICalc.replace(/[^0-9-.]/g, ''));
                    // var thisPrice = 
                    if (key == 'downPPROICalc') {
                        var downpay = (thisPercent/100.00) * thisPrice;
                        if (downpay < .005) {
                            $scope.moneyModels.downPayROICalc = '$0';
                        } else {
                            $scope.moneyModels.downPayROICalc = accounting.formatMoney(downpay);
                        }                    
                    }
                    else if (key == 'closingCPROICalc') 
                    {
                        var closeCost = (thisPercent/100.00) * thisPrice;
                        if (closeCost < .005) {
                            $scope.moneyModels.closingCostROICalc = '$0';
                        } else {
                            $scope.moneyModels.closingCostROICalc = accounting.formatMoney(closeCost);
                        }                    
                    }
                    else if (key == 'manageFPROICalc')
                    {
                        var management = (thisPercent/100.00) * rent;
                        if (management < .005) {
                            $scope.moneyModels.manageFeeROICalc = '$0';
                        } else {
                            $scope.moneyModels.manageFeeROICalc = accounting.formatMoney(management);
                        }
                    }
                    else if (key == 'maintenancePROICalc')
                    {
                        var maintainFee = (thisPercent/100.00) * thisPrice / 12.0;
                        if (maintainFee < .005) {
                            $scope.moneyModels.maintenanceROICalc = '$0';
                        } else {
                            $scope.moneyModels.maintenanceROICalc = accounting.formatMoney(maintainFee);
                        }
                    }                               
                }
                else if (str == 'timeText') 
                {  
                    if (key == 'loanTermROICalc') {
                        obj[key] = obj[key].replace(/[^0-9-.]/g, '') + ' years';
                    } else {
                        if (parseFloat(String(obj[key]).replace(/[^0-9-.]/g, '')) < 0.005) {
                            obj[key] = '$0';
                        } else {
                            obj[key] = accounting.formatMoney(parseFloat(String(obj[key]).replace(/[^0-9-.]/g, '')));
                        }
                        //obj[key] = accounting.formatMoney(parseFloat(obj[key].replace(/[^0-9-.]/g, ''))).split('.')[0];
                    } 
                }
                //Calculate Mortgage Payment, Cash Flow, Cap Rate, and ROI based on inputs
                /***********VARS FOR ROI FORMULA**********/
                var inputPrice = parseFloat(accounting.unformat($scope.moneyModels.priceROICalc));
                var monthRent = parseFloat(accounting.unformat($scope.moneyModels.rentROICalc));
                var mortgage = parseFloat(accounting.unformat($scope.moneyModels.mortgageROICalc));
                var manageFeeRate = parseFloat($scope.rates.manageFPROICalc.replace(/[^0-9-.]/g, ''))/100.00;
                var vacancyRate = parseFloat($scope.rates.vacancyROICalc.replace(/[^0-9-.]/g, ''))/100.00;
                var propertyT = parseFloat(accounting.unformat($scope.moneyModels.propTaxPROICalc));
                var propertyI = parseFloat(accounting.format($scope.moneyModels.propInsPROICalc));
                var hoa = parseFloat(accounting.unformat($scope.wordy.hoaROICalc));
                var maintain = parseFloat(accounting.unformat($scope.moneyModels.maintenanceROICalc));
                var downpayment = parseFloat(accounting.unformat($scope.moneyModels.downPayROICalc));
                var closingcost = parseFloat(accounting.unformat($scope.moneyModels.closingCostROICalc));
                /**************CALC MORTGAGE PAYMENT**********************/
                var mortIR = parseFloat($scope.rates.interestRateROICalc.replace(/[^0-9-.]/g, ''))/100.00;
                var mortLT = parseFloat($scope.wordy.loanTermROICalc.replace(/[^0-9-.]/g, ''));

                var mortupdate = (inputPrice - downpayment) * (mortIR/12.0 * Math.pow(1+(mortIR/12.0),mortLT*12)) / parseFloat((Math.pow(1+(mortIR/12.0),mortLT*12)-1));

                $scope.moneyModels['mortgageROICalc'] = accounting.formatMoney(mortupdate);
                //var updatedMortgage = parseFloat(accounting.unformat($scope.moneyModels.mortgageROICalc));
                /**************CALC CASH FLOW FOR MODAL*******************/
                var flow1 = monthRent * (1 - vacancyRate);
                var flow2 = mortupdate;
                var flow3 = manageFeeRate * monthRent;
                var flow4 = propertyT;
                var flow5 = propertyI;
                var flow6 = hoa;
                var flow7 = maintain;
                /******SET CASH FLOWS FOR DETAILS PAGE AND BELOW FORMULA********/
                var flow = flow1 - flow2 - flow3 - flow4 - flow5 - flow6 - flow7;
        
                $scope.moneyModels['cashFlowROICalc'] = accounting.formatMoney(flow);
                /*****SET CAP RATE**********/
                var cr = String(100*(flow*12)/inputPrice);
                $scope.CapRate = roundPercent(cr, 2);
                
                var year1 = flow;
                /*****2-Year Cash Flow*******/
                // var year2p1 = monthRent * (1.03) * (1 - vacancyRate);
                // var year2p2 = mortupdate;
                // var year2p3 = manageFeeRate * monthRent;
                // var year2p4 = propertyT * (1.03);
                // var year2p5 = propertyI * (1.03);
                // var year2p6 = hoa * 1.03;
                // var year2p7 = maintain * (1.03);
                // var year2 = year2p1 - year2p2 - year2p3 - year2p4 - year2p5 - year2p6 - year2p7;
                /*****3-Year Cash Flow*******/
                // var year3p1 = monthRent * (1.03*1.03) * (1 - vacancyRate);
                // var year3p2 = mortupdate;
                // var year3p3 = manageFeeRate * monthRent;
                // var year3p4 = propertyT * (1.03*1.03);
                // var year3p5 = propertyI * (1.03*1.03);
                // var year3p6 = hoa * (1.03*1.03);
                // var year3p7 = maintain * (1.03*1.03);
                // var year3 = year3p1 - year3p2 - year3p3 - year3p4 - year3p5 - year3p6 - year3p7;

                // var roi = (100*12*(year1 + year2 + year3))/parseFloat(downpayment + closingcost);
                var roi = (100*12*year1)/parseFloat(downpayment + closingcost);
                
                //Set ROI chart data and scope ng-model
                $scope.memId = '70';
                $scope.labels = ["ROI"];
                $scope.colours = ['#72C02C', '#D3D3D3'];
                $scope.data = [roi, 100 - roi];
                if (roi >= 100) {
                    $scope.data = [100, 0];
                }
                if (roi <= 0) {
                    $scope.data = [(-1*roi), 100 - (-1*roi)];
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                }
                if (roi <= -100) {
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                    $scope.data = [100, 0];
                }
                /////SET ROI SCOPE VAR TO BIND IN PIE CHART///////
                $scope.ROI = roundPercent(roi, 2);
                //////////////END OF IF MONTHLY RENT HAS A VALUE///////////////
            }

            function roundPercent(number, decimals) {
                for (var i=0; i<decimals; i++) {
                    number = number * 10;
                }
                var nStr = String(parseInt(Math.round(number)));
                if ((!nStr.includes('-') && nStr.length > 2) || (nStr.includes('-') && nStr.length > 3)) {
                    var n = nStr.substr(0, nStr.length-decimals);
                    var d = nStr.substr(nStr.length-decimals, decimals);
                } 
                else if (nStr.includes('-'))
                {
                    if (nStr.length == 2) {
                        return '-0.0' + nStr.substr(1) + '%';
                    } else if (nStr.length == 3) {
                        return '-0.' + nStr.substr(1) + '%'
                    }
                } else {
                    if (nStr.length == 1) {
                        return '0.0' + nStr.substr(0) + '%';
                    } else if (nStr.length == 2) {
                        return '0.' + nStr + '%';
                    }
                }
                return n + '.' + d + '%';
            }
        }
        //////RESET INPUTS AND CAP RATE/ROI//////////
        $scope.reset = function(listing) {
            $scope.rates = {
                downPPROICalc: '20%',
                closingCPROICalc: '3%',
                interestRateROICalc: '4%',
                vacancyROICalc: '5%',
                manageFPROICalc: '8%',
                maintenancePROICalc: '1%'
            };

            $scope.moneyModels = {
                priceROICalc: accounting.formatMoney(listing.ListPrice.N).split('.')[0], 
                downPayROICalc: accounting.formatMoney(parseFloat($scope.rates.downPPROICalc.replace(/[^0-9-.]/g, '')) * .01 * listing.ListPrice.N), 
                closingCostROICalc: accounting.formatMoney(parseFloat($scope.rates.closingCPROICalc.replace(/[^0-9-.]/g, '')) * .01 * listing.ListPrice.N), 
                cashFlowROICalc: accounting.formatMoney(parseFloat(listing.CashFlow.S)), 
                rentROICalc: accounting.formatMoney(parseFloat(listing.Rent.S)), 
                mortgageROICalc: accounting.formatMoney(parseFloat(listing.MortFee.S)), 
                manageFeeROICalc: accounting.formatMoney(parseFloat($scope.rates.manageFPROICalc.replace(/[^0-9-.]/g, '')) * .01 * parseFloat(listing.Rent.S)),
                maintenanceROICalc: accounting.formatMoney((parseFloat($scope.rates.maintenancePROICalc.replace(/[^0-9-.]/g, '')) * .01 * listing.ListPrice.N)/12), 
                propTaxPROICalc: accounting.formatMoney(parseFloat(listing.PropTax.S)), 
                propInsPROICalc: '$0'//accounting.formatMoney((.002 * listing.ListPrice.N)/12)
            };
            if (listing.Rent.S == '-1') {
                $scope.moneyModels.rentROICalc = 'N/A';
                $scope.ROI = 'Set Rent!';
            } else {
                $scope.ROI = listing.ROI.S + '%';
            }
            $scope.CapRate = listing.CapRate.S + '%';

            $scope.wordy = {
                hoaROICalc: accounting.formatMoney(parseFloat(listing.MonthHOA.S)).split('.')[0],
                loanTermROICalc: '30 years'
            }

            $scope.memId = '70';
            $scope.labels = ["ROI"];
            $scope.colours = ['#72C02C', '#D3D3D3'];
            if ($scope.ROI == 'Set Rent!') {
                $scope.data = [0, 100 - 0];
            } else {
                $scope.data = [parseFloat(listing.ROI.S), 100 - parseFloat(listing.ROI.S)];
                if (listing.ROI.S >= 100) {
                    $scope.data = [100, 0];
                }
                if (listing.ROI.S <= 0) {
                    $scope.data = [(-1*listing.ROI.S), 100 - (-1*listing.ROI.S)];
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                }
                if (listing.ROI.S <= -100) {
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                    $scope.data = [100, 0];
                }
            }
        }
        //////CALL POST SERVICE TO ADD MLSID TO AGENT///////
        $scope.addListing = function(listing) {
            e = angular.element(document.querySelector('#thumb-' + String(listing.MLSNumber.N)));
            e.css('color', '#0091FF');
            Listings.postFavorite(listing);
        }
    }])
    .controller('SavedController', ['$scope', 'Saved', function($scope, Saved) {
        $scope.moneyModels = {};

        $scope.sortROI = function(listing) {
            return parseFloat(listing.ROI.S);
        }
        $scope.showROI = function(rentString) {
            return rentString != '-1';
        }
        $scope.listingData = function (listing) {   
            $scope.selectedListing = listing;
            $scope.selectedPrice = String(listing.ListPrice.N);
            $scope.selectedListingROI = listing.ROI.S + '%';
            $scope.downPayment = String(.2 * listing.ListPrice.N);
            $scope.closingCosts = String(.03 * listing.ListPrice.N);
            $scope.interestRates = '4.0%';
            $scope.loanTerm = '30 years';
            $scope.downPayPer = '20%';
            $scope.closeCostPer = '3%';
            $scope.vacancyRate = '5%';
            $scope.manageFeePer = '8%';
            $scope.maintenanceCostPer = '1%';
            $scope.managementFee = String(.08 * parseFloat(listing.Rent.S));
            $scope.maintenanceCost = String((.01 * listing.ListPrice.N)/12);
            $scope.insuranceTax = String((.002 * listing.ListPrice.N)/12);
            $scope.showModal = true;
            //$scope.DetailsPageROI;
            $scope.ROI = listing.ROI.S + '%';
            $scope.CapRate = listing.CapRate.S + '%';
            $scope.rates = {
                downPPROICalc: '20%',
                closingCPROICalc: '3%',
                interestRateROICalc: '4%',
                vacancyROICalc: '5%',
                manageFPROICalc: '8%',
                maintenancePROICalc: '1%'
            };

            $scope.moneyModels = {
                priceROICalc: accounting.formatMoney(listing.ListPrice.N).split('.')[0], 
                downPayROICalc: accounting.formatMoney(parseFloat($scope.rates.downPPROICalc.replace(/[^0-9-.]/g, '')) * .01 * listing.ListPrice.N), 
                closingCostROICalc: accounting.formatMoney(parseFloat($scope.rates.closingCPROICalc.replace(/[^0-9-.]/g, '')) * .01 * listing.ListPrice.N), 
                cashFlowROICalc: accounting.formatMoney(parseFloat(listing.CashFlow.S)), 
                rentROICalc: accounting.formatMoney(parseFloat(listing.Rent.S)), 
                mortgageROICalc: accounting.formatMoney(parseFloat(listing.MortFee.S)), 
                manageFeeROICalc: accounting.formatMoney(parseFloat($scope.rates.manageFPROICalc.replace(/[^0-9-.]/g, '')) * .01 * parseFloat(listing.Rent.S)),
                maintenanceROICalc: accounting.formatMoney((parseFloat($scope.rates.maintenancePROICalc.replace(/[^0-9-.]/g, '')) * .01 * listing.ListPrice.N)/12), 
                propTaxPROICalc: accounting.formatMoney(parseFloat(listing.PropTax.S)), 
                propInsPROICalc: '$0'//accounting.formatMoney((.002 * listing.ListPrice.N)/12)
            };
            if (listing.Rent.S == '-1') {
                $scope.moneyModels.rentROICalc = 'N/A';
                $scope.ROI = 'Set Rent!'
            }

            $scope.wordy = {
                hoaROICalc: accounting.formatMoney(parseFloat(listing.MonthHOA.S)).split('.')[0],
                loanTermROICalc: '30 years'
            };



            
            $scope.memId = '70';
            $scope.labels = ["ROI"];
            $scope.colours = ['#72C02C', '#D3D3D3'];
            if ($scope.ROI == 'Set Rent!') {
                $scope.data = [0, 100 - 0];
            } else {
                $scope.data = [parseFloat(listing.ROI.S), 100 - parseFloat(listing.ROI.S)];
                if (listing.ROI.S >= 100) {
                    $scope.data = [100, 0];
                }
                if (listing.ROI.S <= 0) {
                    $scope.data = [(-1*listing.ROI.S), 100 - (-1*listing.ROI.S)];
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                }
                if (listing.ROI.S <= -100) {
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                    $scope.data = [100, 0];
                }
            }
            $scope.myInterval = 3000;;
            var photoArray = [];
            var count = 1;
            var limit = listing.PhotoCount.N;
            console.log(limit);
            while (count <= 2 && count <= limit) {
                console.log(limit);
                photoArray.push({
                    image: 'https://s3.amazonaws.com/listing-images1/img/' + listing.Matrix_Unique_ID.N + '/' + count + '.jpeg'
                });
                count = count + 1;
            }

            Chart.defaults.global.legend.display = false;
            Chart.defaults.global.tooltips.enabled = false;

            console.log(photoArray)
            $scope.slides = photoArray
            
            $scope.options = {
                cutoutPercentage: 82.5,
                scales: {
                    paddingLeft: 0,
                },
                segmentShowStroke: false,
                responsive: false,  // set to false to remove responsiveness. Default responsive value is true.
                borderWidth: 0,
            }
        }
        $scope.getMember = function(id) {
            return '60';
        };
        $scope.close = function () {
            $scope.showModal = false;
        };
        $scope.adjustGivenPrice = function(obj, key) {
            var thisPrice = parseFloat(accounting.unformat(obj[key]));
            var downpayrate = parseFloat($scope.rates.downPPROICalc.replace(/[^0-9-.]/g, ''))/100.00;
            var closecostrate = parseFloat($scope.rates.closingCPROICalc.replace(/[^0-9-.]/g, ''))/100.00;
            var maintenancefee = parseFloat($scope.rates.maintenancePROICalc.replace(/[^0-9-.]/g, ''))/100.00;

            var thisDownPay = thisPrice * downpayrate;
            var thisCloseCost = thisPrice * closecostrate;
            var thisMaintenance = thisPrice * maintenancefee / 12.00;
               
            
            if (thisDownPay < 0.005) {
                obj['downPayROICalc'] = '$0';
            } else {
                obj['downPayROICalc'] = accounting.formatMoney(thisDownPay);
            }
            if (thisCloseCost < 0.005) {
                obj['closingCostROICalc'] = '$0';
            } else {
                obj['closingCostROICalc'] = accounting.formatMoney(thisCloseCost);
            }
            if (thisMaintenance < 0.005) {
                obj['maintenanceROICalc'] = '$0';
            } else {
                obj['maintenanceROICalc'] = accounting.formatMoney(thisMaintenance);
            }
            
        }
        $scope.ROICalc = function (str, obj, key) {
            if ($scope.moneyModels.rentROICalc == 'N/A') {
                var roi = 0;
            
                //Set ROI chart data and scope ng-model
                $scope.memId = '70';
                $scope.labels = ["ROI"];
                $scope.colours = ['#72C02C', '#D3D3D3'];
                $scope.data = [roi, 100 - roi];
                if (roi >= 100) {
                    $scope.data = [100, 0];
                }
                if (roi <= 0) {
                    $scope.data = [(-1*roi), 100 - (-1*roi)];
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                }
                if (roi <= -100) {
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                    $scope.data = [100, 0];
                }
                $scope.ROI = 'Set Rent!'
            } else {
                ////////CALCULATE INPUTS BASED ON CHANGES//////////
                if (str == 'money') {
                    if (parseFloat(String(obj[key]).replace(/[^0-9-.]/g, '')) < 0.005) {
                        obj[key] = '$0';
                    } else {
                        obj[key] = accounting.formatMoney(parseFloat(String(obj[key]).replace(/[^0-9-.]/g, '')));
                    }
                    if (key == 'priceROICalc') {
                        $scope.adjustGivenPrice(obj, key);
                    }
                    else if (key == 'rentROICalc')
                    {
                        //Set management fee
                        var thisRent = parseFloat(accounting.unformat(obj[key]));
                        var managerate = parseFloat($scope.rates.manageFPROICalc.replace(/[^0-9-.]/g, ''))/100.00;
                        var thisManageFee = thisRent * managerate;
                        if (thisManageFee < 0.005) {
                            obj['manageFeeROICalc'] = '$0';
                        } else {
                            obj['manageFeeROICalc'] = accounting.formatMoney(thisManageFee);
                        }
                    }
                    else if (key == 'downPayROICalc')
                    {  
                        var newPrice = parseFloat(accounting.unformat(obj[key])) / (parseFloat($scope.rates.downPPROICalc.replace(/[^0-9-.]/g, ''))/100.00);
                        if (newPrice < 0.005) {
                            obj['priceROICalc'] = '$0';
                        } else {
                            obj['priceROICalc'] = accounting.formatMoney(newPrice);
                        }
                        $scope.adjustGivenPrice(obj, 'priceROICalc');
                    }
                    else if (key == 'closingCostROICalc')
                    {
                        var newPrice = parseFloat(accounting.unformat(obj[key])) / (parseFloat($scope.rates.closingCPROICalc.replace(/[^0-9-.]/g, ''))/100.00);
                        if (newPrice < 0.005) {
                            obj['priceROICalc'] = '$0';
                        } else {
                            obj['priceROICalc'] = accounting.formatMoney(newPrice);
                        }
                        $scope.adjustGivenPrice(obj, 'priceROICalc');
                    }
                    else if (key == 'manageFeeROICalc')
                    { 
                        var newRent = parseFloat(accounting.unformat(obj[key])) / (parseFloat($scope.rates.manageFPROICalc.replace(/[^0-9-.]/g, ''))/100.00);
                        if (newRent < 0.005) {
                            obj['rentROICalc'] = '$0';
                        } else {
                            obj['rentROICalc'] = accounting.formatMoney(newRent);
                        } 
                    }   
                    else if (key == 'maintenanceROICalc') 
                    {
                        var newPrice = 12 * parseFloat(accounting.unformat(obj[key])) / (parseFloat($scope.rates.maintenancePROICalc.replace(/[^0-9-.]/g, ''))/100.00);
                        if (newPrice < 0.005) {
                            obj['priceROICalc'] = '$0';
                        } else {
                            obj['priceROICalc'] = accounting.formatMoney(newPrice);
                        }
                        $scope.adjustGivenPrice(obj, 'priceROICalc'); 
                    }
                }
                else if (str == 'percent') 
                {            
                    obj[key] = obj[key].replace(/[^0-9-.]/g, '') + "%";
                    var thisPercent = parseFloat(obj[key].replace(/[^0-9-.]/g, ''));
                    var thisPrice = parseFloat($scope.moneyModels.priceROICalc.replace(/[^0-9-.]/g, ''));
                    var rent = parseFloat($scope.moneyModels.rentROICalc.replace(/[^0-9-.]/g, ''));
                    // var thisPrice = 
                    if (key == 'downPPROICalc') {
                        var downpay = (thisPercent/100.00) * thisPrice;
                        if (downpay < .005) {
                            $scope.moneyModels.downPayROICalc = '$0';
                        } else {
                            $scope.moneyModels.downPayROICalc = accounting.formatMoney(downpay);
                        }                    
                    }
                    else if (key == 'closingCPROICalc') 
                    {
                        var closeCost = (thisPercent/100.00) * thisPrice;
                        if (closeCost < .005) {
                            $scope.moneyModels.closingCostROICalc = '$0';
                        } else {
                            $scope.moneyModels.closingCostROICalc = accounting.formatMoney(closeCost);
                        }                    
                    }
                    else if (key == 'manageFPROICalc')
                    {
                        var management = (thisPercent/100.00) * rent;
                        if (management < .005) {
                            $scope.moneyModels.manageFeeROICalc = '$0';
                        } else {
                            $scope.moneyModels.manageFeeROICalc = accounting.formatMoney(management);
                        }
                    }
                    else if (key == 'maintenancePROICalc')
                    {
                        var maintainFee = (thisPercent/100.00) * thisPrice / 12.0;
                        if (maintainFee < .005) {
                            $scope.moneyModels.maintenanceROICalc = '$0';
                        } else {
                            $scope.moneyModels.maintenanceROICalc = accounting.formatMoney(maintainFee);
                        }
                    }                               
                }
                else if (str == 'timeText') 
                {  
                    if (key == 'loanTermROICalc') {
                        obj[key] = obj[key].replace(/[^0-9-.]/g, '') + ' years';
                    } else {
                        if (parseFloat(String(obj[key]).replace(/[^0-9-.]/g, '')) < 0.005) {
                            obj[key] = '$0';
                        } else {
                            obj[key] = accounting.formatMoney(parseFloat(String(obj[key]).replace(/[^0-9-.]/g, '')));
                        }
                        //obj[key] = accounting.formatMoney(parseFloat(obj[key].replace(/[^0-9-.]/g, ''))).split('.')[0];
                    } 
                }

                //Calculate Mortgage Payment, Cash Flow, Cap Rate, and ROI based on inputs
                /***********VARS FOR ROI FORMULA**********/
                var inputPrice = parseFloat(accounting.unformat($scope.moneyModels.priceROICalc));
                var monthRent = parseFloat(accounting.unformat($scope.moneyModels.rentROICalc));
                var mortgage = parseFloat(accounting.unformat($scope.moneyModels.mortgageROICalc));
                var manageFeeRate = parseFloat($scope.rates.manageFPROICalc.replace(/[^0-9-.]/g, ''))/100.00;
                var vacancyRate = parseFloat($scope.rates.vacancyROICalc.replace(/[^0-9-.]/g, ''))/100.00;
                var propertyT = parseFloat(accounting.unformat($scope.moneyModels.propTaxPROICalc));
                var propertyI = parseFloat(accounting.format($scope.moneyModels.propInsPROICalc));
                var hoa = parseFloat(accounting.unformat($scope.wordy.hoaROICalc));
                var maintain = parseFloat(accounting.unformat($scope.moneyModels.maintenanceROICalc));
                var downpayment = parseFloat(accounting.unformat($scope.moneyModels.downPayROICalc));
                var closingcost = parseFloat(accounting.unformat($scope.moneyModels.closingCostROICalc));
                /**************CALC MORTGAGE PAYMENT**********************/
                var mortIR = parseFloat($scope.rates.interestRateROICalc.replace(/[^0-9-.]/g, ''))/100.00;
                var mortLT = parseFloat($scope.wordy.loanTermROICalc.replace(/[^0-9-.]/g, ''));

                var mortupdate = (inputPrice - downpayment) * (mortIR/12.0 * Math.pow(1+(mortIR/12.0),mortLT*12)) / parseFloat((Math.pow(1+(mortIR/12.0),mortLT*12)-1));

                $scope.moneyModels['mortgageROICalc'] = accounting.formatMoney(mortupdate);
                //var updatedMortgage = parseFloat(accounting.unformat($scope.moneyModels.mortgageROICalc));
                /**************CALC CASH FLOW FOR MODAL*******************/
                var flow1 = monthRent * (1 - vacancyRate);
                var flow2 = mortupdate;
                var flow3 = manageFeeRate * monthRent;
                var flow4 = propertyT;
                var flow5 = propertyI;
                var flow6 = hoa;
                var flow7 = maintain;
                /******SET CASH FLOWS FOR DETAILS PAGE AND BELOW FORMULA********/
                var flow = flow1 - flow2 - flow3 - flow4 - flow5 - flow6 - flow7;
        
                $scope.moneyModels['cashFlowROICalc'] = accounting.formatMoney(flow);
                /*****SET CAP RATE**********/
                var cr = String(100*(flow*12)/inputPrice);
                $scope.CapRate = roundPercent(cr, 2);
                
                var year1 = flow;
                var roi = (100*12*year1)/parseFloat(downpayment + closingcost);
                
                //Set ROI chart data and scope ng-model
                $scope.memId = '70';
                $scope.labels = ["ROI"];
                $scope.colours = ['#72C02C', '#D3D3D3'];
                $scope.data = [roi, 100 - roi];
                if (roi >= 100) {
                    $scope.data = [100, 0];
                }
                if (roi <= 0) {
                    $scope.data = [(-1*roi), 100 - (-1*roi)];
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                }
                if (roi <= -100) {
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                    $scope.data = [100, 0];
                }
                /////SET ROI SCOPE VAR TO BIND IN PIE CHART///////
                $scope.ROI = roundPercent(roi, 2);
            }
            
            function roundPercent(number, decimals) {
                for (var i=0; i<decimals; i++) {
                    number = number * 10;
                }
                var nStr = String(parseInt(Math.round(number)));
                if ((!nStr.includes('-') && nStr.length > 2) || (nStr.includes('-') && nStr.length > 3)) {
                    var n = nStr.substr(0, nStr.length-decimals);
                    var d = nStr.substr(nStr.length-decimals, decimals);
                } 
                else if (nStr.includes('-'))
                {
                    if (nStr.length == 2) {
                        return '-0.0' + nStr.substr(1) + '%';
                    } else if (nStr.length == 3) {
                        return '-0.' + nStr.substr(1) + '%'
                    }
                } else {
                    if (nStr.length == 1) {
                        return '0.0' + nStr.substr(0) + '%';
                    } else if (nStr.length == 2) {
                        return '0.' + nStr + '%';
                    }
                }
                return n + '.' + d + '%';
            }
        }
        //////RESET INPUTS AND CAP RATE/ROI//////////
        $scope.reset = function(listing) {
            $scope.rates = {
                downPPROICalc: '20%',
                closingCPROICalc: '3%',
                interestRateROICalc: '4%',
                vacancyROICalc: '5%',
                manageFPROICalc: '8%',
                maintenancePROICalc: '1%'
            };

            $scope.moneyModels = {
                priceROICalc: accounting.formatMoney(listing.ListPrice.N).split('.')[0], 
                downPayROICalc: accounting.formatMoney(parseFloat($scope.rates.downPPROICalc.replace(/[^0-9-.]/g, '')) * .01 * listing.ListPrice.N), 
                closingCostROICalc: accounting.formatMoney(parseFloat($scope.rates.closingCPROICalc.replace(/[^0-9-.]/g, '')) * .01 * listing.ListPrice.N), 
                cashFlowROICalc: accounting.formatMoney(parseFloat(listing.CashFlow.S)), 
                rentROICalc: accounting.formatMoney(parseFloat(listing.Rent.S)), 
                mortgageROICalc: accounting.formatMoney(parseFloat(listing.MortFee.S)), 
                manageFeeROICalc: accounting.formatMoney(parseFloat($scope.rates.manageFPROICalc.replace(/[^0-9-.]/g, '')) * .01 * parseFloat(listing.Rent.S)),
                maintenanceROICalc: accounting.formatMoney((parseFloat($scope.rates.maintenancePROICalc.replace(/[^0-9-.]/g, '')) * .01 * listing.ListPrice.N)/12), 
                propTaxPROICalc: accounting.formatMoney(parseFloat(listing.PropTax.S)), 
                propInsPROICalc: '$0'//accounting.formatMoney((.002 * listing.ListPrice.N)/12)
            };
            if (listing.Rent.S == '-1') {
                $scope.moneyModels.rentROICalc = 'N/A';
                $scope.ROI = 'Set Rent!';
            } else {
                $scope.ROI = listing.ROI.S + '%';
            }
            $scope.CapRate = listing.CapRate.S + '%';

            $scope.wordy = {
                hoaROICalc: accounting.formatMoney(parseFloat(listing.MonthHOA.S)).split('.')[0],
                loanTermROICalc: '30 years'
            }

            $scope.memId = '70';
            $scope.labels = ["ROI"];
            $scope.colours = ['#72C02C', '#D3D3D3'];
            if ($scope.ROI == 'Set Rent!') {
                $scope.data = [0, 100 - 0];
            } else {
                $scope.data = [parseFloat(listing.ROI.S), 100 - parseFloat(listing.ROI.S)];
                if (listing.ROI.S >= 100) {
                    $scope.data = [100, 0];
                }
                if (listing.ROI.S <= 0) {
                    $scope.data = [(-1*listing.ROI.S), 100 - (-1*listing.ROI.S)];
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                }
                if (listing.ROI.S <= -100) {
                    $scope.colours = ['#FF0000', '#D3D3D3'];
                    $scope.data = [100, 0];
                }
            }
        }

        Saved.getSavedIds($scope);
        $scope.deleteListing = function(listing) {
            e = angular.element(document.querySelector('#item-' + String(listing.MLSNumber.N)));
            e.css('display', 'none');
            Saved.deleteFavorite(listing);
        }

    }])
    .service("Clients", ['$http', function($http) {
        this.getClients = function(scope) {
            scope.clients = [];
            return $http.get('/clients/info').
                then(function(response) {
                    // scope.clients = JSON.parse(response.data).Responses.Clients;
                    var clients = JSON.parse(response.data).Responses.Clients;
                    // scope.clients = clients;
                    console.log("clients!!!");
                    console.log(clients);
                    for (var i=0; i<clients.length; i++) {
                        var origValue = clients[i].OriginalValue.N;
                        //if the ZillowHood is "None", use zip table else use normal
                        if (clients[i].ZillowHood.S != "None") {
                            $http.post('/clients/appreciation', clients[i]).
                                then(function(res) {
                                    // console.log(Object.values(JSON.parse(res.data).Item).length);
                                    if(Object.values(JSON.parse(res.data).Item)[0]) {                       
                                        console.log('RESSSSS');
                                        // console.log(JSON.parse(res.data).Item);
                                        console.log(Object.values(JSON.parse(res.data).Item)[0].N);
                                        var currValue = Object.values(JSON.parse(res.data).Item)[0].N;

                                        var apprec = (currValue - origValue) / parseFloat(origValue);
                                        var apprecFinal = (apprec*100).toFixed(2) + "%";
                                        // scope.clients[i].appreciation = apprec;
                                        // scope.clientAppreciation.push(apprecFinal);
                                        console.log('res data');
                                        // console.log(typeof res.data);
                                        console.log(JSON.parse(res.data).client);
                                        var client = JSON.parse(res.data).client;
                                        client['clientAppreciation'] = apprecFinal;
                                        scope.clients.push(client);
                                        // scope.clients = clients;
                                        // console.log(index);
                                        // console.log('Embedded clients');
                                        // console.log(clients);
                                        // console.log(i);
                                    } else {
                                        alert("Appreciation for one of your client's properties cannot be retrieved");
                                    }
                                });
                        } else {
                            $http.post('/clients/appreciation_zip', clients[i]).
                                then(function(res2) {
                                    if(JSON.parse(res2.data).Item) {
                                        console.log('RESSSSS2');
                                        console.log(Object.values(JSON.parse(res2.data).Item)[0].N);
                                        var currValue = Object.values(JSON.parse(res2.data).Item)[0].N;

                                        var apprec = (currValue - origValue) / parseFloat(origValue);
                                        var apprecFinal = (apprec*100).toFixed(2) + "%";
                                        // scope.clients[i].appreciation = apprec;
                                        // scope.clientAppreciation.push(apprecFinal);
                                        console.log('res2 data');
                                        // console.log(typeof res2.data);
                                        console.log(JSON.parse(res2.data).client);
                                        var client = JSON.parse(res2.data).client;
                                        client['clientAppreciation'] = apprecFinal;
                                        scope.clients.push(client);
                                        // console.log(index);
                                        // console.log('Embedded clients');
                                        // console.log(clients);
                                        // console.log(i);
                                    }
                                });
                        }
                    }
                }, function(res) {
                    console.log('Error finding clients');
                });
        }
        this.deleteClient = function(client) {
            return $http.post('/clients/delete', client).
                then(function(response) {
                    console.log(response)
                    $http.get('/clients');
                });
        }
    }])
    .service("InitialQuery", ["$http", function($http) {
        // this.setInitial = function(rootScope, zip) {
        //     rootScope.initialQuery = zip;
        //     console.log(rootScope.initialQuery);
        //     //return $http.get('/listings');
        //     // console.log('Doin the post!');
        //     // return $http.post("/initialQuery", {"zip":zip}).
        //     //     then(function(response) {
        //     //         console.log(JSON.parse(response.data));
        //     //         // $http.get('/listings.json');
        //     //     }, function(response) {
        //     //         alert("Error posting.");
        //     //     });
        // }
    }])
    .service("Listings", ["$http", function($http) {
        this.getListings = function(scope) {
            return $http.get("/listings.json").
                then(function(response) {
                    scope.listings = JSON.parse(response.data);
                    // alert(scope.listings.Items.length);
                }, function(response) {
                    console.log("Error finding listings.");
                });
        }
        this.postFavorite = function(listing) {
            return $http.post("/listings", listing).
                then(function(response) {
                    console.log("SESSION RESPONSE:");
                    console.log(JSON.parse(response.data));
                });
        }
    }])
    .service("Saved", ['$http', function($http) {
        this.getSavedIds = function(scope) {
            var ids;
            return $http.get('/savedListings.json').
                then(function(response) {
                    //scope.listings = JSON.parse(response.data);
                    //scope.favIds = JSON.parse(response.data);
                    console.log("RESPONSE");
                    console.log(response.data);
                    ids = response.data;
                }).
                    then(function() {
                        return $http.post('/savedListings/saved', ids).
                            then(function(res) {
                                scope.listings = JSON.parse(res.data).Responses.resi_table;
                                console.log("FINAL RESPONSE");
                                console.log(scope.listings);
                            })
                    })
        }
        this.deleteFavorite = function(listing) {
            return $http.post("/savedListings", listing).
                then(function(response) {
                    console.log("DELETE RESPONSE:");
                    console.log(JSON.parse(response.data));
                })
        }
    }])