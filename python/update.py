from rets import Session
import smtplib
import boto3
import time
from boto3.dynamodb.conditions import Key, Attr
import decimal
import os


def calculateMonthlyMortgage(listPrice):
    downpayment = .2 * listPrice
    interestRate = .04
    loanTerm = 30
    payment = (listPrice - downpayment) * ((interestRate/12)*(1+interestRate/12)**(loanTerm*12)) / ((1+interestRate/12)**(loanTerm*12)-1)
    return payment


def cashFlow(rent, mortgage, hoaFee, hoaFreq, listPrice, year, propertyTax):
    if hoaFee and hoaFreq:
        if hoaFreq == 'Monthly':
            hoaFee = int(hoaFee)
        if hoaFreq == 'Annually':
            hoaFee = int(hoaFee) / 12
        if hoaFreq == 'Quarterly':
            hoaFee = int(hoaFee) / 3
        if hoaFreq == 'Semi-Annually':
            hoaFee = int(hoaFee) / 6
    else:
        hoaFee = 0
    propertyTax = (float(propertyTax) *.01) * listPrice
    vacancyRate = .05
    managementFee = .08
    insurance = .002 * listPrice
    maintenance = .01 * listPrice
    cf1 = (rent * (1+.03)**year) * (1-vacancyRate)
    propertyTax = propertyTax * (1.03)**year/ 12
    cf2 = cf1 - (mortgage + (managementFee * rent) + propertyTax + (hoaFee * (1.03)**year) + (maintenance * (1.03)**year / 12))
    return [cf2, hoaFee, propertyTax]


def demo(rentData, i, ncdict, scdict):
    dynamodb = boto3.resource('dynamodb')
    table2 = dynamodb.Table('rent_table')

    listingSQFT = i.get('SqFtTotal')
    listPrice = i.get('ListPrice')
    monthlyRent = dbPull(i, rentData)

    mortgageMonth = calculateMonthlyMortgage(listPrice)

    dict = 0
    if "North" in i.get('StateOrProvince'):
        dict = ncdict
    else:
        dict = scdict

    propertyTax = 0
    propertyTax = dict.get(i.get('CountyOrParish').lower())

    lv = cashFlow(monthlyRent, mortgageMonth, i.get('AssociationFee'), i.get('AssociationFeeFrequency'), listPrice, 0, propertyTax)
    flow1 = lv[0]
    hoaFee = lv[1]
    propertyTax1 = lv[2]
    cashf = (flow1 * 12) / (int(listPrice) * .23)
    rate = cashf * 100
    cp = flow1 * 12 / int(listPrice)
    cp = cp * 100
    s = '%.2f' % rate
    cp = '%.2f' % cp
    flow1 = '%.2f' % flow1
    hoaFee = '%.2f' % hoaFee
    propertyTax1 = "%.2f" % propertyTax1
    mortgageMonth = "%.2f" % mortgageMonth
    return [s, cp, monthlyRent, mortgageMonth, propertyTax1, hoaFee, flow1]


def calculateMonthlyRent(items, listingSQFT):
    total = 0
    count = 0
    for item in items:
        ratio = item.get('RATIO_CurrentPrice_By_SQFT')
        if ratio:
            total = total + float(ratio)
            count = count + 1
    avg = total / count
    rent = avg * float(listingSQFT)
    return rent


def sortTaxSC():
    file = open('sc_latest.csv')
    data = file.readlines()
    file.close()
    td = {}
    for each in data[1:]:
        content = each.split(',')
        rate = content[1].replace('%',"")
        rate = rate.strip('\n')
        content[0] = content[0].strip(' ')
        content[0] = content[0].lower()
        td[content[0]] = rate
    td.pop('', None)
    return td


def sortTaxNC():
    file = open('2016-17_countytaxrates.csv')
    data = file.readlines()
    file.close()
    td = {}
    for each in data[1:]:
        content = each.split(',')
        content[0] = content[0].strip(' ')
        content[0] = content[0].lower()
        td[content[0]] = content[1].strip('\n')
    td.pop('', None)
    return td

def acquireData():

    #create img folder
    try:
        os.mkdir("img")
    except:
        print("DIRECTORY ALREADY ADDED")

    login_url = 'http://matrixrets.carolinamls.com/rets/login.ashx'
    username = 'RETSSuiteTech'
    password = '&&gMbb)2'
    rets_client = Session(login_url, username, password)
    rets_client.login()
    dynamodb = boto3.resource('dynamodb', "us-east-1")
    client = boto3.client('dynamodb')
    s3 = boto3.resource('s3')
    table = dynamodb.Table('resi_table')
    off = 0
    check = True
    start = 0
    old = 1200 #1200 ALREADY IN DB
    listings = []
    #listings.append(rets_client.search('Property', 'Resi', search_filter={'Status': 'ACT'}, limit=1))
    # PROGRAM TAKES 5:26 min to run
    while check:
        listings.append(rets_client.search('Property', 'Resi', search_filter={'Status': 'ACT'}, offset=off))
        off = off + 5000
        start = len(listings[0])
        if start == old:
            check = False
        old = start

    fields = ["StatusChangeTimestamp","SqFtTotal", "MLSNumber", "StateOrProvince", "PropertyType", "ArchitecturalStyle", "InteriorFeatures", "CDOM", "Matrix_Unique_ID", "RATIO_ClosePrice_By_ListPrice", "PropertySubType", "CountyOrParish", "OriginalListPrice", "RoomCount", "SubdivisionName", "HighSchool", "Model", "ListingType", "ConstructionType", "Status", "FireplaceYN", "BathsFull", "StreetName", "RATIO_CurrentPrice_By_SQFT", "AssociationFeeFrequency", "DOM", "PostalCodePlus4", "StreetNumberNumeric", "BathsHalf", "ComplexName", "MiddleOrJuniorSchool", "ListPrice", "LotDimension", "YearBuilt", "OwnershipType", "BathsTotal", "UnitNumber", "PostalCode", "LotSizeUnits", "AssociationFee", "LotSizeArea", "LotFeatures", "BedsTotal", "CommunityFeatures", "PropertyType", "ElementarySchool", "City", "StreetSuffix", "PhotoCount"]
    count = 0
    ucount = 0
    ncdict = sortTaxNC()
    scdict = sortTaxSC()
    #rent data
    dynamodb = boto3.resource('dynamodb')
    table2 = dynamodb.Table('rent_table')
    response1 = table2.scan(
        ProjectionExpression='PostalCode, ComplexName, BedsTotal, RATIO_CurrentPrice_By_SQFT, SubdivisionName, StreetName, StreetSuffix'
    )
    rentData = response1.get('Items')
    table3 = dynamodb.Table('resi_table_zip')


    with table.batch_writer() as batch1, table3.batch_writer() as batch2:
        for list in listings[0]:
            Items = {}
            check2 = False
            mls = int(list.get('MLSNumber'))
            mlsid = list.get('Matrix_Unique_ID')
            response = client.get_item(
                TableName='resi_table',
                Key={
                    'MLSNumber': {'N': str(mls)},
                },
                ProjectionExpression= 'StatusChangeTimestamp'
            )
            item = response.get('Item')

            if item is None:
                check2 = True
            elif item.get('StatusChangeTimestamp').get('S') != list.get('StatusChangeTimestamp'):
                check2 = True
            #check2 = True UNCOMMENT FOR FORCED CHECK
            if check2:
                picture = rets_client.get_preferred_object('Property', 'Photo', mlsid, location=0)
                fname = "img/" + str(mlsid) + ".jpeg"
                file = open(fname, 'wb')
                file.write(picture.get('content'))
                file.close()
                data = open(fname, 'rb')
                s3.Bucket('listing-images1').put_object(Key=fname, Body=data)
                data.close()
                carasol = rets_client.get_object('Property', 'Photo', mlsid, location = 0)
                picNum = 1
                os.mkdir("img/" + str(mlsid))
                while picNum <= 4 and len(carasol) - 1 >= picNum:
                    slides = rets_client.get_object('Property', 'Photo', mlsid, picNum, location=0)
                    fname = "img/" + str(mlsid) + "/" + str(picNum) + ".jpeg"
                    file = open(fname, 'wb')
                    file.write(slides[0].get('content'))
                    file.close()
                    data = open(fname, 'rb')
                    s3.Bucket('listing-images1').put_object(Key=fname, Body=data)
                    picNum = picNum + 1
                    data.close()

                for x in list:
                    if x in fields:
                        if list.get(x):
                            try:
                                Items[x] = int(list.get(x))
                            except:
                                Items[x] = list.get(x)
                Items['ListPrice'] = int(float(Items.get('ListPrice')))
                if Items.get('AssociationFee'):
                    Items['AssociationFee'] = int(float(Items.get('AssociationFee')))
                vals = demo(rentData, Items, ncdict, scdict)
                Items['ROI'] = str(vals[0])
                Items['CapRate'] = str(vals[1])
                Items['Rent'] = str(vals[2])
                Items['MortFee'] = str(vals[3])
                Items['PropTax'] = str(vals[4])
                Items['MonthHOA'] = str(vals[5])
                Items['CashFlow'] = str(vals[6])

                batch1.put_item(
                    Item=Items
                )
                batch2.put_item(
                    Item=Items
                )
                ucount = ucount + 1
                print("UPDATED")
            count = count + 1
            if count == 1200:
                break
            print(count)
    # todo remove closed listings
    rets_client.logout()
    print("TOTAL ITERATIONS " + str(count))
    print("UPDATED " + str(ucount))
    return [count, ucount]


def main():
    #dbPull()
    message = acquireData()
    # server = smtplib.SMTP('smtp.gmail.com', 587)
    # server.starttls()
    # server.login("advaith96@gmail.com", "*************")
    # mes = "UPDATED\t " + str(message[1]) + " TOTAL ITERATIONS\t" + str(message[0]) + " TIME\n" + str(diff)
    # server.sendmail("advaith96@gmail.com", "advaith96@gmail.com", mes)
    # server.quit()

def checkRatio(result):
    count = 0
    for x in result:
        ratio = x.get('RATIO_CurrentPrice_By_SQFT')
        if ratio:
            count = count + 1
    if count <= 2:
        return False
    return True

def dbPull(i, rentData):

    beds = int(i.get('BedsTotal'))
    pc = int(i.get('PostalCode'))
    cn = i.get('ComplexName')
    listingSQFT = i.get('SqFtTotal')
    listPrice = i.get('ListPrice')
    sdn = i.get('SubdivisionName')
    st = i.get('StreetName')
    ss = i.get('StreetSuffix')
    ratio = i.get('RATIOCurrentPriceBySQFT')

    if str(cn) == 'None':
        cn = '0'
    if str(sdn) == 'None':
        sdn = '0'

    if float(listPrice) < 100000 or beds >= 5:
        return -1
    else:
        # STEP 1 Monthly Rent ComplexName, PostalCode, and Beds
        result = list(filter(lambda x: int(x.get('BedsTotal')) == beds and int(x.get('PostalCode')) == pc and x.get('ComplexName') == cn, rentData))
        if len(result) >= 2 and checkRatio(result):
            print(result)
            print("CROSS1")
            monthlyRent = calculateMonthlyRent(result, listingSQFT)
            return monthlyRent
        else:
            # STEP 2 Monthly Rent ComplexName and Postal Code
            result = list(filter(lambda x: int(x.get('PostalCode')) == pc and x.get('ComplexName') == cn, rentData))
            if len(result) >= 3 and checkRatio(result):
                print("CROSS2")
                monthlyRent = calculateMonthlyRent(result, listingSQFT)
                return monthlyRent
            else:
                #   STEP 3 Monthly Rent SubdivisionName, StreetName and StreetSuffix PostalCode and Beds Total
                result = list(filter(lambda x: int(x.get('BedsTotal')) == beds and int(x.get('PostalCode')) == pc and x.get('SubdivisionName') == sdn and x.get('StreetName') == st and x.get('StreetSuffix') == ss, rentData))
                if len(result) >= 2 and checkRatio(result):
                    print("CROSS3")
                    monthlyRent = calculateMonthlyRent(result, listingSQFT)
                    return monthlyRent
                else:
                    # STEP 4 Monthly Rent Subdivision and Postal Code and Beds Totals
                    result = list(filter(lambda x: int(x.get('BedsTotal')) == beds and int(x.get('PostalCode')) == pc and x.get('SubdivisionName') == sdn, rentData))
                    if len(result) >= 3 and checkRatio(result):
                        print("CROSS4")
                        monthlyRent = calculateMonthlyRent(result, listingSQFT)
                        return monthlyRent
                    else:
                        #   STEP 5 Monthly Rent Subdivision and Postal Code
                        result = list(filter(lambda x: int(x.get('PostalCode')) == pc and x.get('SubdivisionName') == sdn, rentData))
                        if len(result) >= 3 and checkRatio(result):
                            print("CROSS5")
                            monthlyRent = calculateMonthlyRent(result, listingSQFT)
                            return monthlyRent
                        else:
                            # STEP 6 Street Name and Street Suffix and Postal Code and BedsTotal
                            result = list(filter(lambda x: int(x.get('BedsTotal')) == beds and int(x.get('PostalCode')) == pc and x.get('StreetName') == st and x.get('StreetSuffix') == ss, rentData))
                            if len(result) >= 3 and checkRatio(result):
                                print("CROSS6")
                                monthlyRent = calculateMonthlyRent(result, listingSQFT)
                                return monthlyRent
                            else:
                                #   STEP 7 Street Name and Street Suffix and PostalCode
                                result = list(filter(
                                    lambda x: int(x.get('PostalCode')) == pc and x.get('StreetName') == st and x.get('StreetSuffix') == ss, rentData))
                                if len(result) >= 3 and checkRatio(result):
                                    print("CROSS7")
                                    monthlyRent = calculateMonthlyRent(result, listingSQFT)
                                    return monthlyRent
                                else:
                                    # STEP 8 PostalCode and Beds
                                    result = list(filter(lambda x: int(x.get('BedsTotal')) == beds and int(x.get('PostalCode')) == pc, rentData))
                                    if len(result) >= 3 and checkRatio(result):
                                        monthlyRent = calculateMonthlyRent(result, listingSQFT)
                                        print("CROSS8")
                                        return monthlyRent
                                    else:
                                        # STEP 9 PostalCode
                                        result = list(filter(lambda x: int(x.get('PostalCode')) == pc, rentData))
                                        if len(result) >= 3 and checkRatio(result):
                                            print("CROSS9")
                                            monthlyRent = calculateMonthlyRent(result, listingSQFT)
                                            return monthlyRent
                                        else:
                                            return -1
main()
